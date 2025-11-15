import syncConfig from '../config/syncConfig.js';

const STORAGE_KEYS = {
  tokens: 'vick-mick-sync-tokens',
  accountFiles: 'vick-mick-sync-account-files',
  pkceVerifier: 'vick-mick-sync-verifier',
  oauthState: 'vick-mick-sync-state',
};

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

function createRandomString() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function parseJwt(token = '') {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(decoded)));
  } catch (error) {
    return null;
  }
}

class SyncManager {
  constructor(config = {}) {
    this.config = { ...syncConfig, ...config };
    this.tokens = null;
    this.status = 'idle';
    this.statusMessage = '';
    this.lastSyncedAt = null;
    this.accountId = null;
    this.accountFiles = this.loadAccountFiles();
    this.pendingState = null;
    this.syncTimeout = null;
    this.statusListeners = new Set();
  }

  async init() {
    this.loadTokens();
    await this.handleRedirect();
    if (this.tokens && !this.isAccessTokenValid()) {
      await this.refreshAccessToken();
    }
    this.setStatus(this.tokens ? 'connected' : 'disconnected');
  }

  onStatusChange(callback) {
    if (typeof callback === 'function') {
      this.statusListeners.add(callback);
      callback(this.getStatus());
      return () => this.statusListeners.delete(callback);
    }
    return () => {};
  }

  getStatus() {
    return {
      state: this.status,
      message: this.statusMessage,
      lastSyncedAt: this.lastSyncedAt,
      isAuthenticated: Boolean(this.tokens?.accessToken),
    };
  }

  setStatus(status, message = '') {
    this.status = status;
    this.statusMessage = message;
    this.statusListeners.forEach((listener) => listener(this.getStatus()));
  }

  loadTokens() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.tokens);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.tokens = parsed;
      this.accountId = this.extractAccountIdFromToken();
    } catch (error) {
      console.error('SyncManager.loadTokens', error);
    }
  }

  saveTokens(tokens) {
    this.tokens = tokens;
    localStorage.setItem(STORAGE_KEYS.tokens, JSON.stringify(tokens));
  }

  extractAccountIdFromToken() {
    const payload = this.tokens?.idToken ? parseJwt(this.tokens.idToken) : null;
    return payload?.sub || null;
  }

  loadAccountFiles() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.accountFiles);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.error('SyncManager.loadAccountFiles', error);
      return {};
    }
  }

  saveAccountFiles() {
    try {
      localStorage.setItem(STORAGE_KEYS.accountFiles, JSON.stringify(this.accountFiles));
    } catch (error) {
      console.error('SyncManager.saveAccountFiles', error);
    }
  }

  async handleRedirect() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const expectedState = sessionStorage.getItem(STORAGE_KEYS.oauthState);
    if (!code || !state || state !== expectedState) {
      return;
    }
    this.setStatus('authenticating', 'Обмен кода авторизации...');
    const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.pkceVerifier);
    try {
      const tokens = await this.requestToken({
        code,
        codeVerifier,
        grantType: 'authorization_code',
      });
      this.saveTokens(tokens);
      this.accountId = this.extractAccountIdFromToken();
      this.setStatus('connected', 'Авторизация пройдена');
    } catch (error) {
      console.error('SyncManager.handleRedirect', error);
      this.setStatus('error', 'Ошибка авторизации');
    } finally {
      sessionStorage.removeItem(STORAGE_KEYS.pkceVerifier);
      sessionStorage.removeItem(STORAGE_KEYS.oauthState);
      params.delete('code');
      params.delete('state');
      const cleanedSearch = params.toString();
      const nextUrl = `${window.location.pathname}${cleanedSearch ? `?${cleanedSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, document.title, nextUrl);
    }
  }

  async requestToken({ code, codeVerifier, grantType }) {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      grant_type: grantType,
      redirect_uri: this.config.redirectUri,
    });
    if (grantType === 'authorization_code') {
      body.set('code', code || '');
      if (codeVerifier) {
        body.set('code_verifier', codeVerifier);
      }
    }
    if (grantType === 'refresh_token') {
      body.set('refresh_token', this.tokens?.refreshToken || '');
    }
    if (this.config.clientSecret) {
      body.set('client_secret', this.config.clientSecret);
    }
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!response.ok) {
      throw new Error('Token exchange failed');
    }
    const payload = await response.json();
    const expiresIn = Number(payload.expires_in) || 3600;
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token || this.tokens?.refreshToken,
      idToken: payload.id_token || this.tokens?.idToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };
  }

  startAuthFlow() {
    if (!this.config.clientId) {
      this.setStatus('error', 'Не задан Client ID');
      return;
    }
    this.accountId = null;
    const verifier = createRandomString();
    sessionStorage.setItem(STORAGE_KEYS.pkceVerifier, verifier);
    generateCodeChallenge(verifier)
      .then((challenge) => {
        const state = createRandomString();
        sessionStorage.setItem(STORAGE_KEYS.oauthState, state);
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', this.config.clientId);
        authUrl.searchParams.set('redirect_uri', this.config.redirectUri);
        authUrl.searchParams.set('scope', this.config.scopes.join(' '));
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('include_granted_scopes', 'true');
        authUrl.searchParams.set('code_challenge', challenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        window.location.href = authUrl.toString();
      })
      .catch((error) => {
        console.error('SyncManager.startAuthFlow', error);
      });
  }

  async disconnect() {
    localStorage.removeItem(STORAGE_KEYS.tokens);
    this.tokens = null;
    this.accountId = null;
    this.setStatus('disconnected', 'Синхронизация отключена');
  }

  async refreshAccessToken() {
    if (!this.tokens?.refreshToken) {
      this.setStatus('disconnected', 'Нужна авторизация');
      return;
    }
    this.setStatus('authenticating', 'Обновляю токен...');
    try {
      const tokens = await this.requestToken({ grantType: 'refresh_token' });
      this.saveTokens(tokens);
      this.accountId = this.extractAccountIdFromToken();
      this.setStatus('connected', 'Авторизация обновлена');
    } catch (error) {
      console.error('SyncManager.refreshAccessToken', error);
      this.setStatus('error', 'Ошибка обновления токена');
    }
  }

  async ensureAccountId() {
    if (this.accountId) {
      return this.accountId;
    }
    if (this.tokens?.idToken) {
      this.accountId = this.extractAccountIdFromToken();
      if (this.accountId) return this.accountId;
    }
    if (!this.tokens?.accessToken) return null;
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: this.authHeaders(),
      });
      if (!response.ok) return null;
      const info = await response.json();
      if (info?.sub) {
        this.accountId = info.sub;
        return this.accountId;
      }
    } catch (error) {
      console.error('ensureAccountId', error);
    }
    return null;
  }

  isAccessTokenValid() {
    return this.tokens?.accessToken && this.tokens.expiresAt && Date.now() < this.tokens.expiresAt - 5000;
  }

  async ensureAccessToken() {
    if (!this.tokens) {
      throw new Error('Нет токена');
    }
    if (!this.isAccessTokenValid()) {
      await this.refreshAccessToken();
    }
    if (!this.tokens?.accessToken) {
      throw new Error('Токен недоступен');
    }
    return this.tokens.accessToken;
  }

  authHeaders() {
    if (!this.tokens?.accessToken) return {};
    return {
      Authorization: `Bearer ${this.tokens.accessToken}`,
    };
  }

  getAccountBackupFileName() {
    const suffix = this.accountId || 'default';
    const base = this.config.backupFileName.replace(/\.json$/i, '');
    return `${base}-${suffix}.json`;
  }

  schedulePush(state) {
    this.pendingState = state;
    if (this.syncTimeout) {
      return;
    }
    this.syncTimeout = setTimeout(() => {
      this.syncTimeout = null;
      this.performPush().catch((error) => {
        console.error('SyncManager.performPush', error);
      });
    }, 2000);
  }

  async performPush() {
    if (!this.pendingState) return;
    try {
      this.setStatus('syncing', 'Сохраняю копию в Drive...');
      const accountId = await this.ensureAccountId();
      if (!accountId) {
        throw new Error('Не удалось определить аккаунт для синхронизации.');
      }
      await this.ensureAccessToken();
      const data = {
        meta: {
          syncedAt: new Date().toISOString(),
        },
        state: this.pendingState,
      };
      const fileId = await this.ensureBackupFile();
      if (!fileId) {
        throw new Error('Не удалось подготовить файл бэкапа.');
      }
      await this.uploadBackup(fileId, data);
      this.lastSyncedAt = data.meta.syncedAt;
      this.setStatus('connected', 'Синхронизация выполнена');
    } catch (error) {
      console.error('SyncManager.performPush', error);
      this.setStatus('error', 'Ошибка синхронизации');
    } finally {
      this.pendingState = null;
    }
  }

  async findBackupFile() {
    if (!this.accountId) return null;
    const queryParts = [`name='${this.getAccountBackupFileName()}'`, "trashed=false"];
    if (this.config.backupFolderId) {
      queryParts.push(`'${this.config.backupFolderId}' in parents`);
    }
    const query = queryParts.join(' and ');
    const params = new URLSearchParams({
      q: query,
      pageSize: '1',
      fields: 'files(id, name)',
    });
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      throw new Error('Не удалось найти файл');
    }
    const payload = await response.json();
    if (payload.files?.length) {
      return payload.files[0].id;
    }
    return null;
  }

  async ensureBackupFile(createIfMissing = true) {
    const accountId = await this.ensureAccountId();
    if (!accountId) return null;
    const cached = this.accountFiles[accountId];
    if (cached) {
      return cached;
    }
    const existing = await this.findBackupFile();
    if (existing) {
      this.accountFiles[accountId] = existing;
      this.saveAccountFiles();
      return existing;
    }
    if (!createIfMissing) {
      return null;
    }
    return this.createBackupFile();
  }

  async createBackupFile() {
    const metadata = {
      name: this.getAccountBackupFileName(),
    };
    if (this.config.backupFolderId) {
      metadata.parents = [this.config.backupFolderId];
    }
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob(['{}'], { type: 'application/json' }));
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: this.authHeaders(),
      body: form,
    });
    if (!response.ok) {
      throw new Error('Создание файла не удалось');
    }
    const payload = await response.json();
    if (this.accountId) {
      this.accountFiles[this.accountId] = payload.id;
      this.saveAccountFiles();
    }
    return payload.id;
  }

  async uploadBackup(fileId, data) {
    const body = JSON.stringify(data);
    const url = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=media`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...this.authHeaders(),
        'Content-Type': 'application/json',
      },
      body,
    });
    if (!response.ok) {
      throw new Error('Не удалось записать файл');
    }
  }

  async pullBackup() {
    const accountId = await this.ensureAccountId();
    if (!accountId) return null;
    const fileId = await this.ensureBackupFile(false);
    if (!fileId) {
      return null;
    }
    await this.ensureAccessToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      console.warn('SyncManager.pullBackup: файл не доступен');
      return null;
    }
    try {
      const backup = await response.json();
      return backup || null;
    } catch (error) {
      console.error('SyncManager.pullBackup', error);
      return null;
    }
  }
}

export { SyncManager };
