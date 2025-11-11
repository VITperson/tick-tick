import { TaskList } from '../components/TaskList.js';
import { createQuickAddForm, sortByPriorityAndTime } from './helpers.js';
import { parseDate, startOfToday } from '../utils/dates.js';
import { formatDateHeading } from '../utils/format.js';

export function renderUpcomingView({ state, handlers } = {}) {
  const container = document.createElement('div');
  container.className = 'view view-upcoming';

  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.textContent = 'Ближайшие 7 дней';
  header.append(title);

  const quickAdd = createQuickAddForm('Добавить задачу на ближайшие дни', (taskTitle) =>
    handlers.quickAdd?.({ title: taskTitle }),
  );

  const list = new TaskList({
    onToggle: (task, checked) => handlers.toggleTask?.(task, checked),
    onEdit: (task) => handlers.editTask?.(task),
    onDelete: (task) => handlers.deleteTask?.(task),
  });

  const startRange = startOfToday();
  const endRange = new Date(startRange);
  endRange.setDate(endRange.getDate() + 6);

  const tasks = (state.tasks || [])
    .filter((task) => !task.doneAt && task.dueAt)
    .filter((task) => isWithinRange(task.dueAt, startRange, endRange));

  const grouped = groupTasksByDate(tasks);
  const sections = grouped.length
    ? grouped.map(({ date, tasks: items }) => ({
        title: formatDateHeading(date),
        tasks: sortByPriorityAndTime(items),
      }))
    : [
        {
          title: null,
          tasks: [],
          emptyMessage: 'Нет задач на ближайшую неделю.',
        },
      ];

  container.append(header, quickAdd, list.renderSections(sections, { timeFormat: state.settings?.timeFormat }));
  return container;
}

function isWithinRange(isoDate, start, end) {
  const date = parseDate(isoDate);
  if (!date) return false;
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function groupTasksByDate(tasks) {
  const map = new Map();
  tasks.forEach((task) => {
    const key = task.dueAt.slice(0, 10);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(task);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, items]) => ({ date, tasks: items }));
}
