export class Header {
  constructor(container, { onSearch, onToggleTimeFormat, onSyncAction } = {}) {
    this.container = container;
    this.onSearch = onSearch;
    this.onToggleTimeFormat = onToggleTimeFormat;
    this.onSyncAction = onSyncAction;
    this.primarySyncAction = 'connect';
    this.#render();
  }

  #render() {
    this.container.classList.add('header');

    const branding = document.createElement('div');
    branding.className = 'header__branding';
    branding.textContent = 'Vick-Mick';

    const searchLabel = document.createElement('label');
    searchLabel.className = 'header__search';
    const labelText = document.createElement('span');
    labelText.className = 'visually-hidden';
    labelText.textContent = 'Поиск задач';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Поиск (Ctrl/Cmd + K)';
    searchInput.addEventListener('input', (event) => {
      this.onSearch?.(event.target.value);
    });

    searchLabel.append(labelText, searchInput);

    const timeToggle = document.createElement('button');
    timeToggle.type = 'button';
    timeToggle.className = 'header__time-toggle';
    timeToggle.textContent = '24h';
    timeToggle.addEventListener('click', () => {
      this.onToggleTimeFormat?.();
    });

    const syncContainer = document.createElement('div');
    syncContainer.className = 'header__cloud-sync';
    const syncStatus = document.createElement('span');
    syncStatus.className = 'header__cloud-sync-status';
    const syncPrimary = document.createElement('button');
    syncPrimary.type = 'button';
    syncPrimary.className = 'header__cloud-sync-btn';
    syncPrimary.addEventListener('click', () => {
      if (!this.onSyncAction) return;
      this.onSyncAction(this.primarySyncAction || 'sync');
    });
    const syncSecondary = document.createElement('button');
    syncSecondary.type = 'button';
    syncSecondary.className = 'header__cloud-sync-btn header__cloud-sync-btn--secondary';
    syncSecondary.addEventListener('click', () => {
      this.onSyncAction?.('disconnect');
    });

    syncContainer.append(syncStatus, syncPrimary, syncSecondary);

    this.searchInput = searchInput;
    this.timeToggle = timeToggle;
    this.syncStatus = syncStatus;
    this.syncPrimaryButton = syncPrimary;
    this.syncSecondaryButton = syncSecondary;
    this.syncSecondaryButton.style.display = 'none';

    this.container.append(branding, searchLabel, timeToggle, syncContainer);
  }

  update(state) {
    const format = state?.settings?.timeFormat === '12h' ? '12h' : '24h';
    this.timeToggle.textContent = format;
    this.timeToggle.setAttribute('aria-pressed', format === '12h' ? 'true' : 'false');
  }

  setSearchValue(value = '') {
    if (!this.searchInput) return;
    this.searchInput.value = value;
  }

  focusSearch() {
    if (!this.searchInput) return;
    this.searchInput.focus();
    this.searchInput.select();
  }

  setSyncStatus({ state, message, lastSyncedAt, isAuthenticated } = {}) {
    if (!this.syncStatus) return;
    let statusLabel = '';
    let primaryLabel = 'Синхронизировать';
    let showSecondary = false;
    switch (state) {
      case 'connected':
        statusLabel = lastSyncedAt
          ? `Синхронизировано ${new Date(lastSyncedAt).toLocaleString()}`
          : 'Готов к синхронизации';
        primaryLabel = 'Синхронизировать';
        this.primarySyncAction = 'sync';
        showSecondary = true;
        break;
      case 'syncing':
        statusLabel = message || 'Синхронизация...';
        primaryLabel = 'Синхронизировать';
        this.primarySyncAction = 'sync';
        showSecondary = Boolean(isAuthenticated);
        break;
      case 'authenticating':
        statusLabel = message || 'Авторизация...';
        primaryLabel = 'Ждите';
        this.primarySyncAction = 'connect';
        showSecondary = Boolean(isAuthenticated);
        break;
      case 'error':
        statusLabel = message || 'Ошибка синхронизации';
        primaryLabel = 'Подключить';
        this.primarySyncAction = 'connect';
        showSecondary = false;
        break;
      default:
        statusLabel = message || 'Облачная синхронизация отключена';
        primaryLabel = 'Подключить';
        this.primarySyncAction = 'connect';
        showSecondary = false;
        break;
    }
    this.syncStatus.textContent = statusLabel;
    this.syncPrimaryButton.textContent = primaryLabel;
    this.syncPrimaryButton.disabled = state === 'syncing';
    this.syncSecondaryButton.style.display = showSecondary ? 'inline-flex' : 'none';
  }
}
