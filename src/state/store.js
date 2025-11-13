import { loadState, scheduleSave, getDefaultState } from './storage.js';
import { createTask, updateTask as updateTaskModel } from '../models/task.js';
import { createProject, updateProject as updateProjectModel } from '../models/project.js';
import { toLocalISOString } from '../utils/dates.js';

const listeners = new Map();
let state = loadState();

function emit(event, payload) {
  const subs = listeners.get(event);
  if (!subs) return;
  subs.forEach((callback) => {
    try {
      callback(payload);
    } catch (error) {
      console.error('Ошибка в подписчике store', error);
    }
  });
}

function setState(nextState, meta = {}) {
  state = nextState;
  scheduleSave(state);
  emit('state:changed', { state, meta });
  return state;
}

function updateState(producer, meta = {}) {
  const next = producer(state);
  if (!next) return state;
  return setState(next, meta);
}

export function subscribe(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  const subs = listeners.get(event);
  subs.add(callback);
  return () => {
    subs.delete(callback);
    if (subs.size === 0) {
      listeners.delete(event);
    }
  };
}

export function getState() {
  return state;
}

export function resetState() {
  return setState(getDefaultState(), { type: 'state:reset' });
}

function normalizeProjectId(value) {
  return value ?? null;
}

function resequence(items) {
  const step = 1000;
  return items.map((item, index) => ({
    ...item,
    order: (index + 1) * step,
  }));
}

function sortByOrder(collection) {
  return [...collection].sort((a, b) => {
    const aOrder = Number.isFinite(a.order) ? a.order : 0;
    const bOrder = Number.isFinite(b.order) ? b.order : 0;
    return aOrder - bOrder;
  });
}

function reorderCollection(collection, id, destinationIndex) {
  const sorted = sortByOrder(collection);
  const index = sorted.findIndex((item) => item.id === id);
  if (index === -1) return collection;
  const targetIndex = Math.max(0, Math.min(sorted.length - 1, destinationIndex));
  const slice = [...sorted];
  const [removed] = slice.splice(index, 1);
  slice.splice(targetIndex, 0, removed);
  return resequence(slice);
}

// --- Task actions ---------------------------------------------------------

export function addTask(input) {
  const task = createTask(input);
  updateState(
    (current) => ({
      ...current,
      tasks: [...current.tasks, task],
    }),
    { type: 'task:add', id: task.id },
  );
  return task;
}

export function updateTask(id, updates) {
  updateState(
    (current) => {
      const task = current.tasks.find((item) => item.id === id);
      if (!task) return current;
      const updated = updateTaskModel(task, updates);
      return {
        ...current,
        tasks: current.tasks.map((item) => (item.id === id ? updated : item)),
      };
    },
    { type: 'task:update', id },
  );
}

export function toggleTaskDone(id, forceState) {
  const now = toLocalISOString(new Date());
  updateState(
    (current) => {
      const task = current.tasks.find((item) => item.id === id);
      if (!task) return current;
      const shouldComplete = typeof forceState === 'boolean' ? forceState : !task.doneAt;
      const updated = updateTaskModel(task, { doneAt: shouldComplete ? now : null });
      return {
        ...current,
        tasks: current.tasks.map((item) => (item.id === id ? updated : item)),
      };
    },
    { type: 'task:toggle', id },
  );
}

export function deleteTask(id) {
  updateState(
    (current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
    }),
    { type: 'task:delete', id },
  );
}

export function reorderTask(taskId, destinationIndex, projectId = null) {
  updateState(
    (current) => {
      const normalizedProjectId = normalizeProjectId(projectId);
      const tasksInProject = current.tasks.filter(
        (task) => normalizeProjectId(task.projectId) === normalizedProjectId,
      );
      if (!tasksInProject.find((task) => task.id === taskId)) {
        return current;
      }
      const reordered = reorderCollection(tasksInProject, taskId, destinationIndex);

      const tasks = current.tasks.map((task) => {
        const replacement = reordered.find((item) => item.id === task.id);
        return replacement || task;
      });

      return {
        ...current,
        tasks,
      };
    },
    { type: 'task:reorder', id: taskId, projectId },
  );
}

export function moveTaskToProject(taskId, projectId, destinationIndex = 0) {
  updateState(
    (current) => {
      const task = current.tasks.find((item) => item.id === taskId);
      if (!task) return current;
      const normalizedProjectId = normalizeProjectId(projectId);
      const updatedTask = updateTaskModel(task, { projectId: normalizedProjectId });
      const otherTasks = current.tasks.map((item) => (item.id === taskId ? updatedTask : item));

      const filtered = otherTasks.filter(
        (item) => normalizeProjectId(item.projectId) === normalizedProjectId,
      );
      const reordered = reorderCollection(filtered, taskId, destinationIndex);
      const tasks = otherTasks.map((item) => reordered.find((r) => r.id === item.id) || item);

      return {
        ...current,
        tasks,
      };
    },
    { type: 'task:move', id: taskId, projectId },
  );
}

// --- Project actions ------------------------------------------------------

export function addProject(input) {
  const project = createProject(input);
  updateState(
    (current) => ({
      ...current,
      projects: [...current.projects, project],
    }),
    { type: 'project:add', id: project.id },
  );
  return project;
}

export function updateProject(id, updates) {
  updateState(
    (current) => {
      const project = current.projects.find((item) => item.id === id);
      if (!project) return current;
      const updated = updateProjectModel(project, updates);
      return {
        ...current,
        projects: current.projects.map((item) => (item.id === id ? updated : item)),
      };
    },
    { type: 'project:update', id },
  );
}

export function deleteProject(id, behavior) {
  updateState(
    (current) => {
      const removeBehavior = behavior || current.settings.removeProjectBehavior;
      const projects = current.projects.filter((project) => project.id !== id);
      let tasks;
      if (removeBehavior === 'delete-with-tasks') {
        tasks = current.tasks.filter((task) => normalizeProjectId(task.projectId) !== id);
      } else {
        tasks = current.tasks.map((task) =>
          normalizeProjectId(task.projectId) === id ? { ...task, projectId: null } : task,
        );
      }
      return {
        ...current,
        projects,
        tasks,
      };
    },
    { type: 'project:delete', id },
  );
}

export function reorderProject(projectId, destinationIndex) {
  updateState(
    (current) => ({
      ...current,
      projects: reorderCollection(current.projects, projectId, destinationIndex),
    }),
    { type: 'project:reorder', id: projectId },
  );
}

// --- Settings --------------------------------------------------------------

export function updateSettings(updates) {
  updateState(
    (current) => ({
      ...current,
      settings: {
        removeProjectBehavior:
          updates?.removeProjectBehavior === 'delete-with-tasks'
            ? 'delete-with-tasks'
            : updates?.removeProjectBehavior === 'move-to-inbox'
              ? 'move-to-inbox'
              : current.settings.removeProjectBehavior,
        timeFormat: updates?.timeFormat === '12h' || updates?.timeFormat === '24h'
          ? updates.timeFormat
          : current.settings.timeFormat,
      },
    }),
    { type: 'settings:update' },
  );
}

export function clearCompletedTasks(projectId) {
  updateState(
    (current) => {
      const target = projectId === undefined ? undefined : normalizeProjectId(projectId);
      return {
        ...current,
        tasks: current.tasks.filter((task) => {
          if (!task.doneAt) return true;
          if (target === undefined) {
            return false;
          }
          return normalizeProjectId(task.projectId) !== target;
        }),
      };
    },
    { type: 'task:clearCompleted', projectId },
  );
}
