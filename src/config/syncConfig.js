const parseEnv = (content = '') => {
  const values = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    if (!key) return;
    values[key.trim()] = rest.join('=').trim();
  });
  return values;
};

function loadEnv() {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/.env', false);
    xhr.send();
    if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
      return parseEnv(xhr.responseText);
    }
  } catch (error) {
    console.warn('syncConfig: не удалось загрузить .env', error);
  }
  return {};
}

const env = loadEnv();
const redirectUri =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:8080';

const syncConfig = {
  clientId: env['Client ID'] || env['CLIENT_ID'] || '',
  clientSecret: env['Client secret'] || env['CLIENT_SECRET'] || '',
  redirectUri,
  scopes: [
    'https://www.googleapis.com/auth/drive.file',
    'openid',
    'email',
    'profile',
  ],
  backupFolderId: '16QB1T6FAk8QdS7aoNg5uoYxnLkpTr58-',
  backupFileName: 'vick-mick-backup.json',
};

export default syncConfig;
