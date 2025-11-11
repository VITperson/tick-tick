import { createId } from '../utils/id.js';

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 10000;
const MAX_TAG = 30;

export const PRIORITY = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
};

export const DEFAULT_DURATION_MINUTES = 60;

function normalizeDuration(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_DURATION_MINUTES;
  }
  return Math.min(24 * 60, Math.max(5, Math.round(numeric)));
}

function clampPriority(value = PRIORITY.NORMAL) {
  const numeric = Number(value);
  if (numeric === PRIORITY.LOW || numeric === PRIORITY.NORMAL || numeric === PRIORITY.HIGH) {
    return numeric;
  }
  return PRIORITY.NORMAL;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  return tags
    .map((tag) => (typeof tag === 'string' ? tag.trim().slice(0, MAX_TAG) : ''))
    .filter((tag) => tag.length > 0)
    .filter((tag) => {
      const id = tag.toLowerCase();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

function normalizeSubtasks(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      id: item?.id || createId(),
      title: typeof item?.title === 'string' ? item.title.trim().slice(0, MAX_TITLE) : '',
      done: Boolean(item?.done),
    }))
    .filter((item) => item.title.length > 0);
}

const nowISO = () => new Date().toISOString();

function sanitizeTitle(title) {
  const value = typeof title === 'string' ? title.trim().slice(0, MAX_TITLE) : '';
  if (!value) {
    throw new Error('Требуется непустой заголовок задачи.');
  }
  return value;
}

function sanitizeDescription(description) {
  if (typeof description !== 'string') return '';
  return description.slice(0, MAX_DESCRIPTION);
}

function sanitizeOrder(order) {
  return Number.isFinite(order) ? Number(order) : Date.now();
}

export function createTask(input) {
  const now = nowISO();
  const task = {
    id: input?.id || createId(),
    title: sanitizeTitle(input?.title),
    description: sanitizeDescription(input?.description),
    projectId: input?.projectId ?? null,
    tags: normalizeTags(input?.tags),
    dueAt: normalizeDate(input?.dueAt),
    isAllDay: Boolean(input?.isAllDay),
    reminderAt: normalizeDate(input?.reminderAt),
    priority: clampPriority(input?.priority),
    subtasks: normalizeSubtasks(input?.subtasks),
    doneAt: normalizeDate(input?.doneAt),
    createdAt: input?.createdAt ? normalizeDate(input.createdAt) || now : now,
    updatedAt: now,
    order: sanitizeOrder(input?.order),
    duration: normalizeDuration(input?.duration ?? DEFAULT_DURATION_MINUTES),
  };
  return task;
}

export function updateTask(task, updates) {
  if (!task) throw new Error('Задача не найдена.');
  const next = {
    ...task,
    title: updates?.title ? sanitizeTitle(updates.title) : task.title,
    description: updates?.description !== undefined ? sanitizeDescription(updates.description) : task.description,
    projectId: updates?.projectId !== undefined ? updates.projectId : task.projectId,
    tags: updates?.tags ? normalizeTags(updates.tags) : task.tags,
    dueAt: updates?.dueAt !== undefined ? normalizeDate(updates.dueAt) : task.dueAt,
    isAllDay: updates?.isAllDay !== undefined ? Boolean(updates.isAllDay) : task.isAllDay,
    reminderAt: updates?.reminderAt !== undefined ? normalizeDate(updates.reminderAt) : task.reminderAt,
    priority: updates?.priority !== undefined ? clampPriority(updates.priority) : task.priority,
    subtasks: updates?.subtasks ? normalizeSubtasks(updates.subtasks) : task.subtasks,
    doneAt: updates?.doneAt !== undefined ? normalizeDate(updates.doneAt) : task.doneAt,
    order: updates?.order !== undefined ? sanitizeOrder(updates.order) : task.order,
    duration: updates?.duration !== undefined ? normalizeDuration(updates.duration) : task.duration,
    updatedAt: nowISO(),
  };
  return next;
}
