import { createId } from '../utils/id.js';

const MAX_NAME = 120;

function sanitizeName(name) {
  const value = typeof name === 'string' ? name.trim().slice(0, MAX_NAME) : '';
  if (!value) {
    throw new Error('Название проекта не может быть пустым.');
  }
  return value;
}

function sanitizeColor(color) {
  if (typeof color !== 'string') return null;
  const value = color.trim();
  return /^#([0-9a-f]{6})$/i.test(value) ? value.toUpperCase() : null;
}

function sanitizeOrder(order) {
  return Number.isFinite(order) ? Number(order) : Date.now();
}

export function createProject(input) {
  const now = new Date().toISOString();
  return {
    id: input?.id || createId(),
    name: sanitizeName(input?.name),
    color: sanitizeColor(input?.color),
    order: sanitizeOrder(input?.order),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProject(project, updates) {
  if (!project) throw new Error('Проект не найден.');
  return {
    ...project,
    name: updates?.name ? sanitizeName(updates.name) : project.name,
    color: updates?.color !== undefined ? sanitizeColor(updates.color) : project.color,
    order: updates?.order !== undefined ? sanitizeOrder(updates.order) : project.order,
    updatedAt: new Date().toISOString(),
  };
}
