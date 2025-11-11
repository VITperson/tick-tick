import { TaskList } from '../components/TaskList.js';
import { createQuickAddForm, sortByPriorityAndTime } from './helpers.js';

export function renderTagView(tag, { state, handlers } = {}) {
  const container = document.createElement('div');
  container.className = 'view view-tag';

  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.textContent = tag ? `#${tag}` : 'Тег';
  header.append(title);

  if (!tag) {
    container.append(header, createEmptyMessage('Выберите тег в сайдбаре.'));
    return container;
  }

  const quickAdd = createQuickAddForm(`Добавить задачу с тегом #${tag}`, (taskTitle) =>
    handlers.quickAdd?.({ title: taskTitle }),
  );

  const list = new TaskList({
    onToggle: (task, checked) => handlers.toggleTask?.(task, checked),
    onEdit: (task) => handlers.editTask?.(task),
    onDelete: (task) => handlers.deleteTask?.(task),
  });

  const tasks = sortByPriorityAndTime(
    (state.tasks || []).filter((task) => !task.doneAt && task.tags?.includes(tag)),
  );

  const sections = [
    {
      title: null,
      tasks,
      emptyMessage: 'Нет задач с этим тегом.',
    },
  ];

  container.append(
    header,
    quickAdd,
    list.renderSections(sections, { timeFormat: state.settings?.timeFormat }),
  );

  return container;
}

function createEmptyMessage(text) {
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  return paragraph;
}
