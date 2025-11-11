import { TaskList } from '../components/TaskList.js';
import { createQuickAddForm, sortByManualOrder } from './helpers.js';

export function renderProjectView(project, { state, handlers, route, projectId } = {}) {
  const container = document.createElement('div');
  container.className = 'view view-project';

  const normalizedProjectId = projectId ?? (project ? project.id : route?.params?.id === 'inbox' ? null : route?.params?.id);
  const isInbox = normalizedProjectId === null;
  const header = document.createElement('header');
  const title = document.createElement('h2');

  if (!project && !isInbox && normalizedProjectId !== undefined) {
    title.textContent = 'Проект не найден';
    header.append(title);
    container.append(header, createEmptyState('Проект не найден или был удалён.'));
    return container;
  }

  title.textContent = project ? project.name : 'Без проекта';
  header.append(title);

  const quickAdd = createQuickAddForm('Добавить задачу в проект', (taskTitle) =>
    handlers.quickAdd?.({ title: taskTitle }),
  );

  const list = new TaskList({
    onToggle: (task, checked) => handlers.toggleTask?.(task, checked),
    onEdit: (task) => handlers.editTask?.(task),
    onDelete: (task) => handlers.deleteTask?.(task),
  });

  const tasks = sortByManualOrder(
    (state.tasks || []).filter(
      (task) => !task.doneAt && normalizeProjectId(task.projectId) === normalizedProjectId,
    ),
  );

  const sections = [
    {
      title: null,
      tasks,
      emptyMessage: 'В этом проекте ещё нет задач.',
    },
  ];

  container.append(
    header,
    quickAdd,
    list.renderSections(sections, {
      timeFormat: state.settings?.timeFormat,
      reorder: {
        enabled: true,
        onReorder: (taskId, index) => handlers.reorderTask?.(taskId, index, normalizedProjectId),
      },
    }),
  );

  return container;
}

function normalizeProjectId(value) {
  return value ?? null;
}

function createEmptyState(text) {
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  return paragraph;
}
