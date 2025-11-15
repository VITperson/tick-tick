import { formatDueDate, formatTimeLabel } from '../utils/format.js';

export function createTaskItem(
  task,
  { onToggle, onEdit, onDelete, onSubtaskToggle, timeFormat = '24h' } = {},
) {
  const item = document.createElement('li');
  item.className = 'task-item';
  item.dataset.id = task.id;
  item.draggable = true;
  item.tabIndex = 0;
  item.setAttribute('role', 'listitem');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean(task.doneAt);
  checkbox.addEventListener('change', () => onToggle?.(task, checkbox.checked));

  const title = document.createElement('div');
  title.className = 'task-item__title';
  title.textContent = task.title;

  const meta = document.createElement('div');
  meta.className = 'task-item__meta';

  if (task.dueAt) {
    const due = document.createElement('span');
    due.className = 'task-item__due';
    due.textContent = formatDueDate(task.dueAt, task.isAllDay);
    if (!task.doneAt && new Date(task.dueAt) < new Date()) {
      due.classList.add('is-overdue');
    }
    meta.append(due);
  }

  if (task.dueAt && !task.isAllDay) {
    const time = document.createElement('span');
    time.className = 'task-item__time';
    time.textContent = formatTimeLabel(task.dueAt, timeFormat);
    meta.append(time);
  }

  if (task.tags?.length) {
    const tags = document.createElement('span');
    tags.className = 'task-item__tags';
    tags.textContent = task.tags.join(', ');
    meta.append(tags);
  }

  if (task.subtasks?.length) {
    const completed = task.subtasks.filter((sub) => sub.done).length;
    const wrapper = document.createElement('div');
    wrapper.className = 'task-item__subtasks-wrapper';

    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'task-item__subtasks-badge';
    badge.textContent = `${completed}/${task.subtasks.length}`;
    badge.setAttribute('aria-label', `${completed} из ${task.subtasks.length} подзадач`);
    badge.setAttribute('aria-haspopup', 'listbox');

    const popover = document.createElement('div');
    popover.className = 'task-item__subtasks-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', 'Подзадачи');

    const list = document.createElement('ul');
    list.className = 'task-item__subtask-list';

    task.subtasks.forEach((subtask) => {
      const row = document.createElement('li');
      row.className = 'task-item__subtask-row';

      const label = document.createElement('label');
      label.className = 'task-item__subtask-label';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(subtask.done);
      checkbox.addEventListener('change', () => {
        onSubtaskToggle?.(task, subtask.id, checkbox.checked);
      });

      const text = document.createElement('span');
      text.className = 'task-item__subtask-text';
      text.textContent = subtask.title;

      label.append(checkbox, text);
      row.append(label);
      list.append(row);
    });

    popover.append(list);
    wrapper.append(badge, popover);
    meta.append(wrapper);
  }

  if (task.reminderAt) {
    const reminder = document.createElement('span');
    reminder.className = 'task-item__reminder';
    reminder.textContent = `⏰ ${formatTimeLabel(task.reminderAt, timeFormat)}`;
    reminder.setAttribute('aria-label', 'Напоминание');
    meta.append(reminder);
  }

  const priority = document.createElement('span');
  priority.className = `task-item__priority priority-${task.priority}`;
  priority.setAttribute('aria-label', 'Приоритет');

  const actions = document.createElement('div');
  actions.className = 'task-item__actions';
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.textContent = 'Редактировать';
  editButton.addEventListener('click', () => onEdit?.(task));
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'Удалить';
  deleteButton.addEventListener('click', () => onDelete?.(task));
  actions.append(editButton, deleteButton);

  const content = document.createElement('div');
  content.className = 'task-item__content';
  content.append(title, meta);

  item.append(checkbox, priority, content, actions);

  item.addEventListener('keydown', (event) => {
    if (event.target !== item) return;
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      const nextState = !checkbox.checked;
      checkbox.checked = nextState;
      onToggle?.(task, nextState);
    }
  });
  return item;
}
