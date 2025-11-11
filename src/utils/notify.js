let notificationPermission = 'default';

export async function ensureNotificationPermission() {
  if (typeof Notification === 'undefined') {
    notificationPermission = 'denied';
    return notificationPermission;
  }
  if (notificationPermission === 'granted' || Notification.permission === 'granted') {
    notificationPermission = 'granted';
    return notificationPermission;
  }
  const result = await Notification.requestPermission();
  notificationPermission = result;
  return result;
}

export function canUseNativeNotifications() {
  if (typeof Notification === 'undefined') return false;
  return Notification.permission === 'granted' || notificationPermission === 'granted';
}

export function showNativeNotification({ title, body }) {
  if (!canUseNativeNotifications()) return;
  try {
    new Notification(title, { body });
  } catch (error) {
    console.warn('Не удалось показать уведомление', error);
  }
}

export class ReminderManager {
  constructor({ onReminder } = {}) {
    this.timers = new Map();
    this.onReminder = onReminder;
  }

  sync(tasks = []) {
    const nextIds = new Set();
    tasks.forEach((task) => {
      if (!task.reminderAt || task.doneAt) {
        return;
      }
      nextIds.add(task.id);
      const existing = this.timers.get(task.id);
      if (existing && existing.reminderAt === task.reminderAt) {
        return;
      }
      if (existing) {
        clearTimeout(existing.timeoutId);
        this.timers.delete(task.id);
      }
      this.#schedule(task);
    });

    this.timers.forEach((entry, id) => {
      if (!nextIds.has(id)) {
        clearTimeout(entry.timeoutId);
        this.timers.delete(id);
      }
    });
  }

  #schedule(task) {
    const reminderDate = new Date(task.reminderAt);
    if (Number.isNaN(reminderDate.getTime())) return;
    const delay = reminderDate.getTime() - Date.now();
    const timeoutId =
      delay <= 0
        ? setTimeout(() => this.#trigger(task), 0)
        : setTimeout(() => this.#trigger(task), Math.min(delay, 2_147_483_647));
    this.timers.set(task.id, { timeoutId, reminderAt: task.reminderAt });
  }

  #trigger(task) {
    const entry = this.timers.get(task.id);
    if (entry) {
      clearTimeout(entry.timeoutId);
      this.timers.delete(task.id);
    }
    if (canUseNativeNotifications()) {
      showNativeNotification({
        title: `Напоминание: ${task.title}`,
        body: task.description || 'Пора выполнить задачу.',
      });
    } else {
      this.onReminder?.(task);
    }
  }
}
