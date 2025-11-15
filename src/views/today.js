import { TaskList } from '../components/TaskList.js';
import { createQuickAddForm, sortByPriorityAndTime, isTaskOverdue, isTaskDueToday } from './helpers.js';

export function renderTodayView({ state, handlers }) {
  const container = document.createElement('div');
  container.className = 'view view-today';

  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.textContent = 'Сегодня';
  header.append(title);

  const quickAdd = createQuickAddForm('Быстрый ввод задачи на сегодня', (taskTitle) =>
    handlers.quickAdd?.({ title: taskTitle }),
  );

  const list = new TaskList({
    onToggle: (task, checked) => handlers.toggleTask?.(task, checked),
    onEdit: (task) => handlers.editTask?.(task),
    onDelete: (task) => handlers.deleteTask?.(task),
    onSubtaskToggle: (task, subtaskId, checked) =>
      handlers.toggleSubtask?.(task, subtaskId, checked),
  });

  const tasks = (state.tasks || []).filter((task) => !task.doneAt);
  const overdue = sortByPriorityAndTime(tasks.filter((task) => isTaskOverdue(task)));
  const today = sortByPriorityAndTime(tasks.filter((task) => isTaskDueToday(task)));

  const sections = [];
  if (overdue.length) {
    sections.push({ title: 'Просроченные', tasks: overdue });
  }
  sections.push({
    title: 'Сегодня',
    tasks: today,
    emptyMessage: 'Нет задач на сегодня. Создайте первую!',
  });

  container.append(header, quickAdd, list.renderSections(sections, { timeFormat: state.settings?.timeFormat }));
  return container;
}
