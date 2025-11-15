import { toLocalISOString } from '../utils/dates.js';

const STORAGE_KEY = 'tt.state.v1';
const SAVE_DELAY = 200;

const BASE_STATE = {
  version: 1,
  projects: [],
  tasks: [],
  settings: {
    removeProjectBehavior: 'move-to-inbox',
    timeFormat: '24h',
  },
};

let saveTimer = null;
let pendingState = null;

function clone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeSettings(settings = {}) {
  const removeProjectBehavior =
    settings.removeProjectBehavior === 'delete-with-tasks' ? 'delete-with-tasks' : 'move-to-inbox';
  const timeFormat = settings.timeFormat === '12h' ? '12h' : '24h';
  return { removeProjectBehavior, timeFormat };
}

function normalizeLoadedState(raw) {
  if (!raw || typeof raw !== 'object') {
    return clone(getDefaultState());
  }

  if (raw.version !== 1) {
    return clone(getDefaultState());
  }

  const state = clone(BASE_STATE);
  state.projects = Array.isArray(raw.projects) ? raw.projects : [];
  state.tasks = (Array.isArray(raw.tasks) ? raw.tasks : []).map((task) => {
    if (!task?.dueAt) return task;
    const date = new Date(task.dueAt);
    if (Number.isNaN(date.getTime())) return task;
    return {
      ...task,
      dueAt: toLocalISOString(date),
    };
  });
  state.settings = normalizeSettings(raw.settings);
  return state;
}

export function getDefaultState() {
  const state = clone(BASE_STATE);
  return state;
}

export function loadState() {
  try {
    if (typeof localStorage === 'undefined') {
      return clone(getDefaultState());
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(getDefaultState());
    const parsed = JSON.parse(raw);
    return normalizeLoadedState(parsed);
  } catch (error) {
    console.warn('Не удалось загрузить состояние, используется значение по умолчанию.', error);
    return clone(getDefaultState());
  }
}

export function scheduleSave(state) {
  pendingState = state;
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  if (typeof localStorage === 'undefined') {
    return;
  }

  saveTimer = setTimeout(() => {
    try {
      const snapshot = pendingState || state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.error('Ошибка сохранения состояния', error);
    }
  }, SAVE_DELAY);
}

export function clearStoredState() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export { STORAGE_KEY };
