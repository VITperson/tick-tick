import { TaskList } from '../components/TaskList.js';

export function renderDoneView({ state, handlers, route } = {}) {
  const container = document.createElement('div');
  container.className = 'view view-done';

  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.textContent = 'Выполненные';
  header.append(title);

  const controls = document.createElement('div');
  controls.className = 'done-controls';

  const select = document.createElement('select');
  select.className = 'done-controls__select';
  addOption(select, 'Все проекты', '');
  addOption(select, 'Без проекта', 'inbox');
  (state.projects || []).forEach((project) => addOption(select, project.name, project.id));

  const selected = route?.params?.project || '';
  select.value = selected || '';
  select.addEventListener('change', () => {
    const value = select.value;
    handlers.setDoneFilter?.(value || null);
  });

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.textContent = 'Очистить';
  clearButton.addEventListener('click', () => {
    const filterValue = select.value;
    const target =
      filterValue === ''
        ? undefined
        : filterValue === 'inbox'
          ? null
          : filterValue;
    handlers.clearCompleted?.(target);
  });

  controls.append(select, clearButton);

  const hint = document.createElement('p');
  hint.className = 'done__hint';
  hint.textContent = 'Верните задачу в активные через пробел/чекбокс.';

  const list = new TaskList({
    onToggle: (task, checked) => handlers.toggleTask?.(task, checked),
    onEdit: (task) => handlers.editTask?.(task),
    onDelete: (task) => handlers.deleteTask?.(task),
    onSubtaskToggle: (task, subtaskId, checked) =>
      handlers.toggleSubtask?.(task, subtaskId, checked),
  });

  const tasks = (state.tasks || [])
    .filter((task) => task.doneAt)
    .filter((task) => matchesFilter(task, selected));

  const sections = [
    {
      title: null,
      tasks: sortCompleted(tasks),
      emptyMessage: 'Завершённых задач пока нет.',
    },
  ];

  clearButton.disabled = tasks.length === 0;

  container.append(header, controls, list.renderSections(sections, { timeFormat: state.settings?.timeFormat }));
  return container;
}

function matchesFilter(task, filterValue) {
  if (!filterValue) return true;
  if (filterValue === 'inbox') {
    return !task.projectId;
  }
  return task.projectId === filterValue;
}

function sortCompleted(tasks) {
  return tasks
    .slice()
    .sort((a, b) => {
      const aDone = a.doneAt ? new Date(a.doneAt).getTime() : 0;
      const bDone = b.doneAt ? new Date(b.doneAt).getTime() : 0;
      return bDone - aDone;
    });
}

function addOption(select, label, value) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.append(option);
}
