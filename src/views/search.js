import { TaskList } from '../components/TaskList.js';

export function renderSearchView(query = '', { state, handlers } = {}) {
  const container = document.createElement('div');
  container.className = 'view view-search';

  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.textContent = 'Поиск';
  header.append(title);
  container.append(header);

  const normalizedQuery = (query || '').trim().toLowerCase();
  if (!normalizedQuery) {
    container.append(createInfo('Введите запрос вверху, чтобы найти задачи.'));
    return container;
  }

  const list = new TaskList({
    onToggle: (task, checked) => handlers.toggleTask?.(task, checked),
    onEdit: (task) => handlers.editTask?.(task),
    onDelete: (task) => handlers.deleteTask?.(task),
    onSubtaskToggle: (task, subtaskId, checked) =>
      handlers.toggleSubtask?.(task, subtaskId, checked),
  });

  const results = (state.tasks || []).filter((task) => matchTask(task, normalizedQuery));

  const sections = [
    {
      title: `Найдено: ${results.length}`,
      tasks: results,
      emptyMessage: 'Ничего не найдено.',
    },
  ];

  container.append(list.renderSections(sections, { timeFormat: state.settings?.timeFormat }));
  return container;
}

function matchTask(task, query) {
  const haystacks = [task.title, task.description].filter(Boolean).map((text) => text.toLowerCase());
  return haystacks.some((text) => text.includes(query));
}

function createInfo(text) {
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  return paragraph;
}
