import { TaskList } from '../components/TaskList.js';
import { sortByPriorityAndTime } from './helpers.js';
import { formatTimeLabel } from '../utils/format.js';
import { groupByDate, isSameDay, parseDate, startOfDay, toLocalISOString } from '../utils/dates.js';
import { DEFAULT_DURATION_MINUTES } from '../models/task.js';

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('ru-RU', { month: 'long' });
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const VIEW_MODES = {
  MONTH: 'month',
  WEEK: 'week',
};
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const HOUR_HEIGHT = 60;
const DEFAULT_WEEK_SCROLL_HOUR = 8;
let viewMode = VIEW_MODES.WEEK;

let visibleMonth = getStartOfMonth(new Date());
let selectedDate = startOfDay(new Date());

function getStartOfMonth(date) {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatMonthLabel(date) {
  const month = MONTH_FORMATTER.format(date);
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

function formatFullDate(date) {
  const label = FULL_DATE_FORMATTER.format(date);
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function addMonths(date, offset) {
  const next = getStartOfMonth(date);
  next.setMonth(next.getMonth() + offset);
  return next;
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function getWeekStart(date) {
  const next = startOfDay(date);
  const offset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - offset);
  return next;
}

function isSameMonth(date, reference) {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

const TOOLTIP_DELAY = 500;
const tooltipContainer =
  typeof document !== 'undefined'
    ? (() => {
        const node = document.createElement('div');
        node.className = 'calendar-tooltip';
        document.body.append(node);
        return node;
      })()
    : null;
let tooltipTimer = null;
let tooltipTarget = null;

function positionTooltip(point) {
  if (!tooltipContainer) return;
  const padding = 8;
  const x = point.clientX + 10;
  const y = point.clientY + 10;
  const width = tooltipContainer.offsetWidth || 220;
  const height = tooltipContainer.offsetHeight || 40;
  const left = Math.min(window.innerWidth - width - padding, x);
  const top = Math.min(window.innerHeight - height - padding, y);
  tooltipContainer.style.left = `${Math.max(padding, left)}px`;
  tooltipContainer.style.top = `${Math.max(padding, top)}px`;
}

function attachTooltip(target, text) {
  if (!tooltipContainer || !target) return;
  const show = (event) => {
    tooltipTimer = setTimeout(() => {
      tooltipTarget = target;
      tooltipContainer.textContent = text;
      tooltipContainer.classList.add('calendar-tooltip--visible');
      positionTooltip({ clientX: event.clientX, clientY: event.clientY });
    }, TOOLTIP_DELAY);
  };
  const hide = () => {
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
    tooltipTarget = null;
    tooltipContainer.classList.remove('calendar-tooltip--visible');
  };
  target.addEventListener('mouseenter', show);
  target.addEventListener('mousemove', (event) => {
    if (tooltipTarget === target) {
      positionTooltip({ clientX: event.clientX, clientY: event.clientY });
    }
  });
  target.addEventListener('mouseleave', hide);
  target.addEventListener('click', hide);
}

function buildProjectMap(projects = []) {
  const map = new Map();
  (projects || []).forEach((project) => {
    if (project?.id) {
      map.set(project.id, project);
    }
  });
  return map;
}

function getTaskTooltip(task, project, timeFormat) {
  const duration = Number.isFinite(Number(task.duration)) ? Number(task.duration) : DEFAULT_DURATION_MINUTES;
  const timeStamp = task.dueAt ? formatTimeLabel(task.dueAt, timeFormat) : 'Без времени';
  const projectName = project?.name ? `${project.name} · ` : '';
  return `${projectName}${task.title}\n${timeStamp} · ${duration} мин`;
}

function toIsoDate(date) {
  return toLocalISOString(date).slice(0, 10);
}

function buildGridDates(centerDate) {
  const start = getStartOfMonth(centerDate);
  const weekStart = (start.getDay() + 6) % 7;
  const totalCells = WEEK_DAYS.length * 6;
  const dates = [];
  for (let index = 0; index < totalCells; index += 1) {
    const cellDate = new Date(start);
    cellDate.setDate(1 + index - weekStart);
    dates.push(cellDate);
  }
  return dates;
}

function buildMonthGrid(tasksByDate, timeFormat, handlers, selectDate, projectMap) {
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  const weekHeader = document.createElement('div');
  weekHeader.className = 'calendar-grid__header';
  WEEK_DAYS.forEach((day) => {
    const cell = document.createElement('span');
    cell.textContent = day;
    weekHeader.append(cell);
  });

  const gridBody = document.createElement('div');
  gridBody.className = 'calendar-grid__body';

  const cells = buildGridDates(visibleMonth);
  const today = startOfDay(new Date());

  cells.forEach((cellDate) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    if (!isSameMonth(cellDate, visibleMonth)) {
      button.classList.add('calendar-day--outside');
    }
    if (isSameDay(cellDate, today)) {
      button.classList.add('calendar-day--today');
    }
    if (isSameDay(cellDate, selectedDate)) {
      button.classList.add('calendar-day--selected');
    }

    const dayNumber = document.createElement('span');
    dayNumber.className = 'calendar-day__number';
    dayNumber.textContent = cellDate.getDate();
    button.append(dayNumber);

    const isoKey = toIsoDate(cellDate);
    const dayTasks = tasksByDate.get(isoKey) || [];
    if (dayTasks.length) {
      button.classList.add('calendar-day--busy');
    }

    const tasksContainer = document.createElement('div');
    tasksContainer.className = 'calendar-day__tasks';
    dayTasks.slice(0, 3).forEach((task) => {
      tasksContainer.append(
        createTaskChip(task, timeFormat, handlers, projectMap.get(task.projectId)),
      );
    });
    if (dayTasks.length > 3) {
      const more = document.createElement('span');
      more.className = 'calendar-day__more';
      more.textContent = `+${dayTasks.length - 3}…`;
      tasksContainer.append(more);
    }

    button.append(tasksContainer);
    button.addEventListener('click', () => {
      selectDate(cellDate);
    });

    gridBody.append(button);
  });

  grid.append(weekHeader, gridBody);
  return grid;
}

function buildWeekView(tasksByDate, timeFormat, handlers, selectDate, projectMap) {
  const wrapper = document.createElement('div');
  wrapper.className = 'calendar-week';
  const weekStart = getWeekStart(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const today = startOfDay(new Date());

  const headerRow = document.createElement('div');
  headerRow.className = 'calendar-week__header-row';
  const headerSpacer = document.createElement('div');
  headerSpacer.className = 'calendar-week__header-spacer';
  headerRow.append(headerSpacer);

  weekDays.forEach((day) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-week__header-cell';
    if (isSameDay(day, today)) {
      cell.classList.add('calendar-week__header-cell--today');
    }
    if (isSameDay(day, selectedDate)) {
      cell.classList.add('calendar-week__header-cell--selected');
    }
    if (!isSameMonth(day, visibleMonth)) {
      cell.classList.add('calendar-week__header-cell--outside');
    }
    const dayIndex = (day.getDay() + 6) % 7;
    cell.textContent = `${WEEK_DAYS[dayIndex]} ${day.getDate()}`;
    cell.addEventListener('click', () => selectDate(day));
    headerRow.append(cell);
  });

  const body = document.createElement('div');
  body.className = 'calendar-week__body';
  body.style.setProperty('--hour-height', `${HOUR_HEIGHT}px`);

  const timeColumn = document.createElement('div');
  timeColumn.className = 'calendar-week__times';
  HOURS.forEach((hour) => {
    const timeCell = document.createElement('div');
    timeCell.className = 'calendar-week__time-cell';
    timeCell.textContent = `${String(hour).padStart(2, '0')}:00`;
    timeColumn.append(timeCell);
  });
  body.append(timeColumn);

  function snapToQuarter(minutes) {
    return Math.round(minutes / 15) * 15;
  }

  const MIN_DURATION = 15;
  const DAY_MINUTES = 24 * 60;
  const QUARTER_MINUTES = 15;

  function startResizing(event, direction, task, day, taskBlock, handle) {
    const due = parseDate(task.dueAt);
    if (!due) return;
    const initialDuration = Number.isFinite(Number(task.duration))
      ? Number(task.duration)
      : DEFAULT_DURATION_MINUTES;
    const initialStart = due.getHours() * 60 + due.getMinutes();
    const initialEnd = Math.min(24 * 60, initialStart + initialDuration);
    const startY = event.clientY;
    const pointerId = event.pointerId;
    let previewStart = initialStart;
    let previewDuration = initialDuration;

    const clampMinutes = (value) => Math.max(0, Math.min(DAY_MINUTES - MIN_DURATION, value));

    const moveHandler = (moveEvent) => {
      const deltaMinutes = ((moveEvent.clientY - startY) / HOUR_HEIGHT) * 60;
      if (direction === 'bottom') {
        const rawDuration = initialDuration + deltaMinutes;
        const snapped = snapToQuarter(rawDuration);
        previewDuration = Math.min(DAY_MINUTES - initialStart, Math.max(MIN_DURATION, snapped));
        taskBlock.style.height = `${Math.max((previewDuration / 60) * HOUR_HEIGHT, 28)}px`;
      } else {
        const rawStart = initialStart + deltaMinutes;
        const snappedStart = snapToQuarter(rawStart);
        const maxStart = Math.min(initialEnd - MIN_DURATION, DAY_MINUTES - MIN_DURATION);
        previewStart = Math.min(maxStart, clampMinutes(snappedStart));
        previewDuration = Math.max(MIN_DURATION, initialEnd - previewStart);
        taskBlock.style.top = `${Math.max((previewStart / 60) * HOUR_HEIGHT, 0)}px`;
        taskBlock.style.height = `${Math.max((previewDuration / 60) * HOUR_HEIGHT, 28)}px`;
      }
    };

    const upHandler = () => {
      handle.releasePointerCapture?.(pointerId);
      document.body.style.cursor = '';
      document.removeEventListener('pointermove', moveHandler);
      document.removeEventListener('pointerup', upHandler);
      const updates = { duration: Math.round(previewDuration) };
      if (direction === 'top') {
        const originalDate = parseDate(task.dueAt) || new Date(day);
        const newDue = new Date(originalDate);
        newDue.setHours(0, 0, 0, 0);
        newDue.setMinutes(Math.round(previewStart));
        updates.dueAt = toLocalISOString(newDue);
      }
      handlers.updateTask?.(task, updates);
    };

    document.body.style.cursor = 'ns-resize';
    handle.setPointerCapture?.(pointerId);
    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', upHandler);
  }

  function attachHandle(handle, direction, task, day, taskBlock) {
    handle.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      event.preventDefault();
      startResizing(event, direction, task, day, taskBlock, handle);
    });
  }

  weekDays.forEach((day) => {
    const column = document.createElement('div');
    column.className = 'calendar-week__day-column';
    if (isSameDay(day, today)) {
      column.classList.add('calendar-week__day-column--today');
    }
    if (isSameDay(day, selectedDate)) {
      column.classList.add('calendar-week__day-column--selected');
    }
    if (!isSameMonth(day, visibleMonth)) {
      column.classList.add('calendar-week__day-column--outside');
    }
    const highlight = document.createElement('span');
    highlight.className = 'calendar-week__hover-highlight';
    column.append(highlight);

    const updateHoverHighlight = (event) => {
      const rect = column.getBoundingClientRect();
      if (!rect.height) return;
      const relativeY = event.clientY - rect.top;
      const minutes = Math.max(
        0,
        Math.min(DAY_MINUTES - QUARTER_MINUTES, (relativeY / rect.height) * DAY_MINUTES),
      );
      const quarterStart = Math.floor(minutes / QUARTER_MINUTES) * QUARTER_MINUTES;
      const top = (quarterStart / 60) * HOUR_HEIGHT;
      highlight.style.top = `${top}px`;
      highlight.style.opacity = '1';
    };

    const hideHoverHighlight = () => {
      highlight.style.opacity = '0';
    };

    column.addEventListener('mousemove', updateHoverHighlight);
    column.addEventListener('mouseleave', hideHoverHighlight);

    column.addEventListener('click', (event) => {
      const rect = column.getBoundingClientRect();
      const validityCheck = rect.height && handlers.createTask;
      let payload = null;
      if (validityCheck) {
        const relativeY = event.clientY - rect.top;
        const minutes = Math.round(
          Math.min(24 * 60 - 1, Math.max(0, (relativeY / rect.height) * 24 * 60)),
        );
        const dueDate = new Date(day);
        dueDate.setHours(0, 0, 0, 0);
        dueDate.setMinutes(minutes);
        dueDate.setSeconds(0);
        dueDate.setMilliseconds(0);
        payload = {
          dueAt: toLocalISOString(dueDate),
          duration: DEFAULT_DURATION_MINUTES,
        };
      }
      selectDate(day);
      if (payload) {
        handlers.createTask(payload);
      }
    });

    const tasksLayer = document.createElement('div');
    tasksLayer.className = 'calendar-week__tasks-layer';

    const dayKey = toIsoDate(day);
    (tasksByDate.get(dayKey) || [])
      .slice()
      .sort((a, b) => {
        const aTime = parseDate(a.dueAt)?.getTime() || 0;
        const bTime = parseDate(b.dueAt)?.getTime() || 0;
        return aTime - bTime;
      })
      .forEach((task) => {
        const due = parseDate(task.dueAt);
        if (!due) return;
        const startMinutes = due.getHours() * 60 + due.getMinutes();
        const durationMinutes = Number.isFinite(Number(task.duration))
          ? Number(task.duration)
          : DEFAULT_DURATION_MINUTES;
        const top = (startMinutes / 60) * HOUR_HEIGHT;
        const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 28);
        const taskBlock = document.createElement('button');
        taskBlock.type = 'button';
        taskBlock.className = 'calendar-week__task-block';
        if (task.doneAt) {
          taskBlock.classList.add('calendar-week__task-block--done');
        }
        if (task.isAllDay) {
          taskBlock.classList.add('calendar-week__task-block--allday');
        }
        taskBlock.style.top = `${top}px`;
        taskBlock.style.height = `${height}px`;
        const project = projectMap.get(task.projectId);
        const tooltipText = getTaskTooltip(task, project, timeFormat);
        attachTooltip(taskBlock, tooltipText);
        const topHandle = document.createElement('span');
        topHandle.className = 'calendar-week__task-handle calendar-week__task-handle--top';
        const bottomHandle = document.createElement('span');
        bottomHandle.className = 'calendar-week__task-handle calendar-week__task-handle--bottom';
        const content = document.createElement('div');
        content.className = 'calendar-week__task-block__content';
        if (project) {
          const projectBadge = document.createElement('span');
          projectBadge.className = 'calendar-week__task-block__project';
          projectBadge.textContent = project.name;
          if (project.color) {
            projectBadge.style.background = project.color;
          }
          content.append(projectBadge);
        }
        const text = document.createElement('span');
        text.textContent = task.title;
        content.append(text);

        attachHandle(topHandle, 'top', task, day, taskBlock);
        attachHandle(bottomHandle, 'bottom', task, day, taskBlock);

        taskBlock.append(topHandle, content, bottomHandle);
        taskBlock.addEventListener('click', (event) => {
          event.stopPropagation();
          handlers.editTask?.(task);
        });
        tasksLayer.append(taskBlock);
      });

    column.append(tasksLayer);
    body.append(column);
  });

  wrapper.append(headerRow, body);
  return wrapper;
}

function createTaskChip(task, timeFormat, handlers, project) {
  const label = document.createElement('button');
  label.type = 'button';
  label.className = 'calendar-day__task';
  if (task.doneAt) {
    label.classList.add('calendar-day__task--done');
  }
  if (project) {
    label.classList.add('calendar-day__task--with-project');
  }
  const timestamp = !task.isAllDay && task.dueAt ? formatTimeLabel(task.dueAt, timeFormat) : '';
  const text = timestamp ? `${timestamp} · ${task.title}` : task.title;

  if (project) {
    const badge = document.createElement('span');
    badge.className = 'calendar-day__task__project';
    badge.textContent = project.name;
    if (project.color) {
      badge.style.background = project.color;
    }
    label.append(badge);
  }

  const content = document.createElement('span');
  content.className = 'calendar-day__task__text';
  content.textContent = text;
  label.append(content);

  label.addEventListener('click', (event) => {
    event.stopPropagation();
    handlers.editTask?.(task);
  });
  const tooltipText = getTaskTooltip(task, project, timeFormat);
  attachTooltip(label, tooltipText);
  return label;
}

function renderCalendarView({ state, handlers }) {
  const timeFormat = state.settings?.timeFormat || '24h';
  const projectMap = buildProjectMap(state.projects);
  const tasksByDate = groupByDate(state.tasks || []);
  const container = document.createElement('div');
  container.className = 'view view-calendar';

  const header = document.createElement('header');
  header.className = 'calendar-view__header';

  const controls = document.createElement('div');
  controls.className = 'calendar-view__header-controls';

  const prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.textContent = '←';
  prevButton.title = 'Предыдущий период';
  prevButton.addEventListener('click', () => {
    if (viewMode === VIEW_MODES.MONTH) {
      visibleMonth = addMonths(visibleMonth, -1);
    } else {
      selectedDate = startOfDay(addDays(selectedDate, -7));
      visibleMonth = getStartOfMonth(selectedDate);
    }
    updateMonthLabel();
    updateGrid();
    updateDetails();
  });

  const monthLabel = document.createElement('span');
  monthLabel.className = 'calendar-view__month-label';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.textContent = '→';
  nextButton.title = 'Следующий период';
  nextButton.addEventListener('click', () => {
    if (viewMode === VIEW_MODES.MONTH) {
      visibleMonth = addMonths(visibleMonth, 1);
    } else {
      selectedDate = startOfDay(addDays(selectedDate, 7));
      visibleMonth = getStartOfMonth(selectedDate);
    }
    updateMonthLabel();
    updateGrid();
    updateDetails();
  });

  const todayButton = document.createElement('button');
  todayButton.type = 'button';
  todayButton.textContent = 'Сегодня';
  todayButton.addEventListener('click', () => {
    const today = startOfDay(new Date());
    selectedDate = today;
    visibleMonth = getStartOfMonth(today);
    updateMonthLabel();
    updateGrid();
    updateDetails();
  });

  const modeToggle = document.createElement('div');
  modeToggle.className = 'calendar-view__mode-toggle';

  const weekButton = document.createElement('button');
  weekButton.type = 'button';
  weekButton.textContent = 'Неделя';
  weekButton.dataset.mode = VIEW_MODES.WEEK;

  const monthButton = document.createElement('button');
  monthButton.type = 'button';
  monthButton.textContent = 'Месяц';
  monthButton.dataset.mode = VIEW_MODES.MONTH;

  const toggleButtons = [weekButton, monthButton];
  toggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.mode;
      if (viewMode === mode) return;
      viewMode = mode;
      if (viewMode === VIEW_MODES.WEEK) {
        visibleMonth = getStartOfMonth(selectedDate);
      }
      updateModeButtons();
      updateMonthLabel();
      updateGrid();
      updateDetails();
    });
  });

  function updateModeButtons() {
    toggleButtons.forEach((button) => {
      const active = button.dataset.mode === viewMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  modeToggle.append(weekButton, monthButton);
  const navGroup = document.createElement('div');
  navGroup.className = 'calendar-view__nav-group';
  navGroup.append(prevButton, monthLabel, nextButton);
  controls.append(navGroup, modeToggle, todayButton);
  header.append(controls);

  const gridWrapper = document.createElement('div');
  gridWrapper.className = 'calendar-view__grid';

  let hasPerformedInitialWeekScroll = false;
  let preservedScrollTop = 0;

  gridWrapper.addEventListener('scroll', () => {
    if (viewMode === VIEW_MODES.WEEK) {
      preservedScrollTop = gridWrapper.scrollTop;
    }
  });

  function scheduleWeekScroll(weekView) {
    if (!weekView || !gridWrapper) return;
    requestAnimationFrame(() => {
      const headerHeight =
        weekView.querySelector('.calendar-week__header-row')?.offsetHeight || 0;
      const targetOffset = DEFAULT_WEEK_SCROLL_HOUR * HOUR_HEIGHT;
      gridWrapper.scrollTop = Math.max(0, targetOffset - headerHeight);
      preservedScrollTop = gridWrapper.scrollTop;
      hasPerformedInitialWeekScroll = true;
    });
  }

  const detailsSection = document.createElement('section');
  detailsSection.className = 'calendar-view__details';

  const detailsHeader = document.createElement('div');
  detailsHeader.className = 'calendar-view__details-header';
  const detailsTitle = document.createElement('h3');
  detailsTitle.textContent = `Задачи ${formatFullDate(selectedDate)}`;
  detailsHeader.append(detailsTitle);

  const detailListContainer = document.createElement('div');
  detailListContainer.className = 'calendar-view__details-content';

  const taskList = new TaskList({
    onToggle: (task, checked) => handlers.toggleTask?.(task, checked),
    onEdit: (task) => handlers.editTask?.(task),
    onDelete: (task) => handlers.deleteTask?.(task),
  });

  detailListContainer.append(
    taskList.renderSections(
      [
        {
          title: '',
          tasks: [],
          emptyMessage: 'На выбранную дату задач нет.',
        },
      ],
      { timeFormat },
    ),
  );

  detailsSection.append(detailsHeader, detailListContainer);
  container.append(header, gridWrapper, detailsSection);

  function selectDate(date) {
    selectedDate = startOfDay(date);
    visibleMonth = getStartOfMonth(selectedDate);
    updateGrid();
    updateDetails();
  }

  function updateMonthLabel() {
    if (viewMode === VIEW_MODES.MONTH) {
      monthLabel.textContent = formatMonthLabel(visibleMonth);
    } else {
      const weekStart = getWeekStart(selectedDate);
      const weekEnd = addDays(weekStart, 6);
      monthLabel.textContent = `${formatFullDate(weekStart)} – ${formatFullDate(weekEnd)}`;
    }
  }

  function updateGrid() {
    gridWrapper.innerHTML = '';
    if (viewMode === VIEW_MODES.MONTH) {
      gridWrapper.append(buildMonthGrid(tasksByDate, timeFormat, handlers, selectDate, projectMap));
    } else {
      const weekView = buildWeekView(
        tasksByDate,
        timeFormat,
        handlers,
        selectDate,
        projectMap,
      );
      gridWrapper.append(weekView);
      if (!hasPerformedInitialWeekScroll) {
        scheduleWeekScroll(weekView);
      } else {
        gridWrapper.scrollTop = preservedScrollTop;
      }
    }
  }

  function updateDetails() {
    const selectedKey = toIsoDate(selectedDate);
    const selectedTasks = sortByPriorityAndTime(tasksByDate.get(selectedKey) || []);
    detailsTitle.textContent = `Задачи ${formatFullDate(selectedDate)}`;
    detailListContainer.innerHTML = '';
    detailListContainer.append(
      taskList.renderSections(
        [
          {
            title: '',
            tasks: selectedTasks,
            emptyMessage: 'На выбранную дату задач нет.',
          },
        ],
        { timeFormat },
      ),
    );
  }

  updateModeButtons();
  updateMonthLabel();
  updateGrid();
  updateDetails();

  return container;
}

export { renderCalendarView };
