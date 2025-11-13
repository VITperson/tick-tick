import { createId } from '../utils/id.js';
import { toLocalISOString } from '../utils/dates.js';

const STORAGE_KEY = 'tt.state.v1';
const SAVE_DELAY = 200;

const PROJECT_PRESETS = [
  { id: 'proj-alpha', name: 'Product Alpha', color: '#EB5757' },
  { id: 'proj-growth', name: 'Growth & Marketing', color: '#2F80ED' },
  { id: 'proj-ops', name: 'Operations & Support', color: '#27AE60' },
  { id: 'proj-life', name: 'Personal & Wellness', color: '#F2C94C' },
];

const buildDemoProjects = () => {
  const nowIso = toLocalISOString(new Date());
  return PROJECT_PRESETS.map((preset, index) => ({
    id: preset.id,
    name: preset.name,
    color: preset.color,
    order: (index + 1) * 1000,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
};

const buildDemoTasks = (projects = []) => {
  const now = new Date();
  const getStartOfWeek = (date) => {
    const clone = new Date(date);
    clone.setHours(0, 0, 0, 0);
    const day = clone.getDay();
    const diff = (day + 6) % 7;
    clone.setDate(clone.getDate() - diff);
    return clone;
  };

  const weekStart = getStartOfWeek(now);
  const schedule = [
    {
      title: 'Утренняя синхронизация',
      days: [0, 1, 2, 3, 4],
      startMinutes: 8 * 60 + 15,
      duration: 30,
      priority: 3,
      projectId: 'proj-ops',
    },
    {
      title: 'Глубокая работа над фичей',
      days: [0, 1, 2, 3, 4],
      startMinutes: 9 * 60,
      duration: 180,
      priority: 2,
      projectId: 'proj-alpha',
    },
    {
      title: 'Обновление дашборда метрик',
      days: [0, 2, 4],
      startMinutes: 12 * 60 + 15,
      duration: 45,
      priority: 2,
      projectId: 'proj-growth',
    },
    {
      title: 'Разбор входящих задач',
      days: [0, 1, 2, 3, 4],
      startMinutes: 13 * 60,
      duration: 30,
      priority: 1,
      projectId: 'proj-ops',
    },
    {
      title: 'Командные 1:1',
      days: [0, 2, 4],
      startMinutes: 13 * 60 + 45,
      duration: 90,
      priority: 3,
      projectId: 'proj-ops',
    },
    {
      title: 'Ланч & нетворкинг',
      days: [0, 1, 2, 3, 4],
      startMinutes: 12 * 60,
      duration: 45,
      priority: 1,
      projectId: 'proj-life',
    },
    {
      title: 'Маркетинговые эксперименты',
      days: [1, 3],
      startMinutes: 15 * 60,
      duration: 120,
      priority: 2,
      projectId: 'proj-growth',
    },
    {
      title: 'Созвон с дизайном',
      days: [1, 3],
      startMinutes: 17 * 60,
      duration: 60,
      priority: 2,
      projectId: 'proj-alpha',
    },
    {
      title: 'Отчёт по итогу дня',
      days: [0, 1, 2, 3, 4],
      startMinutes: 18 * 60,
      duration: 30,
      priority: 2,
      projectId: 'proj-ops',
    },
    {
      title: 'Клиентская поддержка',
      days: [1, 2, 4],
      startMinutes: 19 * 60,
      duration: 60,
      priority: 1,
      projectId: 'proj-ops',
    },
    {
      title: 'Вечерний спорт',
      days: [1, 3, 5],
      startMinutes: 20 * 60,
      duration: 60,
      priority: 2,
      projectId: 'proj-life',
    },
    {
      title: 'Спринт по контенту',
      days: [5],
      startMinutes: 10 * 60,
      duration: 150,
      priority: 2,
      projectId: 'proj-growth',
    },
    {
      title: 'Прототип выходного дня',
      days: [6],
      startMinutes: 10 * 60 + 30,
      duration: 210,
      priority: 1,
      projectId: 'proj-alpha',
    },
    {
      title: 'Планирование следующей недели',
      days: [6],
      startMinutes: 15 * 60,
      duration: 120,
      priority: 2,
      projectId: 'proj-ops',
    },
    {
      title: 'Личное развитие',
      days: [5],
      startMinutes: 15 * 60 + 30,
      duration: 90,
      priority: 2,
      projectId: 'proj-life',
    },
  ];

  const nowIso = toLocalISOString(now);
  const tasks = [];
  let order = 0;
  schedule.forEach((entry) => {
    entry.days.forEach((dayOffset) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + dayOffset);
      const due = new Date(date);
      const hours = Math.floor(entry.startMinutes / 60);
      const minutes = entry.startMinutes % 60;
      due.setHours(hours, minutes, 0, 0);

      order += 1;
      tasks.push({
        id: createId(),
        title: entry.title,
        description: entry.description || '',
        projectId: entry.projectId || null,
        tags: entry.tags || [],
        dueAt: toLocalISOString(due),
        isAllDay: false,
        reminderAt: null,
        priority: entry.priority || 2,
        subtasks: [],
        doneAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        order: order * 1000,
        duration: entry.duration || 60,
      });
    });
  });
  return tasks;
};

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
  const demoProjects = buildDemoProjects();
  state.projects = demoProjects;
  state.tasks = buildDemoTasks(demoProjects);
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
