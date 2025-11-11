import { parseDate, startOfToday, isSameDay } from '../utils/dates.js';

export function createQuickAddForm(placeholder, onSubmit) {
  const form = document.createElement('form');
  form.className = 'quick-add';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.required = true;
  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Добавить';
  form.append(input, button);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    onSubmit?.(title);
    input.value = '';
    input.focus();
  });
  return form;
}

export function sortByPriorityAndTime(tasks) {
  return tasks
    .slice()
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const aTime = parseDate(a.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = parseDate(b.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      return a.title.localeCompare(b.title);
    });
}

export function sortByManualOrder(tasks) {
  return tasks.slice().sort((a, b) => {
    const aOrder = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
    if (aOrder === bOrder) {
      return a.createdAt.localeCompare(b.createdAt);
    }
    return aOrder - bOrder;
  });
}

export function isTaskOverdue(task) {
  if (!task.dueAt || task.doneAt) return false;
  const due = parseDate(task.dueAt);
  if (!due) return false;
  return due.getTime() < startOfToday().getTime();
}

export function isTaskDueToday(task) {
  if (!task.dueAt || task.doneAt) return false;
  const due = parseDate(task.dueAt);
  if (!due) return false;
  return isSameDay(due, new Date());
}
