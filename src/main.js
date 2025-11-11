import { App } from './app.js';
import { ensureNotificationPermission } from './utils/notify.js';

const root = document.getElementById('app');

if (!root) {
  throw new Error('Не найден контейнер #app.');
}

const app = new App(root);
app.init();

if (typeof window !== 'undefined' && typeof Notification !== 'undefined') {
  setTimeout(() => {
    if (Notification.permission === 'default') {
      ensureNotificationPermission();
    }
  }, 1500);
}
