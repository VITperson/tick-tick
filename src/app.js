import { initRouter, navigate } from './router.js';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { TaskEditorModal } from './components/TaskEditorModal.js';
import { ReminderManager } from './utils/notify.js';
import { formatDueDate, formatTimeLabel } from './utils/format.js';
import { toLocalISOString } from './utils/dates.js';
import {
  getState,
  subscribe,
  addTask,
  updateTask,
  deleteTask,
  toggleTaskDone,
  addProject,
  updateProject,
  deleteProject,
  reorderTask,
  reorderProject,
  clearCompletedTasks,
  updateSettings,
} from './state/store.js';
import { renderTodayView } from './views/today.js';
import { renderUpcomingView } from './views/upcoming.js';
import { renderProjectView } from './views/project.js';
import { renderTagView } from './views/tag.js';
import { renderDoneView } from './views/done.js';
import { renderSearchView } from './views/search.js';
import { renderCalendarView } from './views/calendar.js';

export class App {
  constructor(root) {
    this.root = root;
    this.state = getState();
    this.route = null;
    this.isSidebarCollapsed = false;
  }

  init() {
    this.#buildLayout();
    this.header = new Header(this.headerContainer, {
      onSearch: (value) => this.#handleSearch(value),
      onToggleTimeFormat: () => this.#handleToggleTimeFormat(),
    });
    this.sidebar = new Sidebar(this.sidebarContainer, {
      onNewTask: () => this.#openTaskEditor(null, this.#getRouteDefaults()),
      onProjectCreate: (data) => this.#handleProjectCreate(data),
      onProjectEdit: (project) => this.#handleProjectEdit(project),
      onProjectDelete: (project) => this.#handleProjectDelete(project),
      onToggleCollapse: (value) => this.#setSidebarCollapsed(value),
      onProjectReorder: (projectId, index) => this.#handleProjectReorder(projectId, index),
    });
    this.editor = new TaskEditorModal({
      onSubmit: (data, task) => this.#handleTaskSubmit(data, task),
      onDelete: (task) => this.#handleTaskDelete(task),
      onClose: () => this.#restoreFocus(),
    });
    this.reminderManager = new ReminderManager({
      onReminder: (task) => this.#handleReminder(task),
    });
    this.#bindKeyboardShortcuts();

    this.unsubscribeStore = subscribe('state:changed', ({ state }) => {
      this.state = state;
      this.reminderManager?.sync(state.tasks);
      this.render();
    });

    initRouter((route) => {
      this.route = route;
      this.render();
    });

    if (typeof window !== 'undefined' && !window.location.hash) {
      navigate({ name: 'calendar' });
    }

    this.render();
    this.reminderManager?.sync(this.state.tasks);
  }

  #buildLayout() {
    this.root.innerHTML = '';
    const shell = document.createElement('div');
    shell.className = 'app-shell';
    this.shell = shell;

    this.sidebarContainer = document.createElement('aside');
    this.sidebarContainer.className = 'app-sidebar';
    this.sidebarContainer.setAttribute('role', 'navigation');

    const main = document.createElement('div');
    main.className = 'app-main';

    this.headerContainer = document.createElement('header');
    this.headerContainer.className = 'app-header';

    this.notificationsContainer = document.createElement('div');
    this.notificationsContainer.className = 'app-notifications';

    this.contentContainer = document.createElement('main');
    this.contentContainer.className = 'app-content';

    main.append(this.headerContainer, this.notificationsContainer, this.contentContainer);
    shell.append(this.sidebarContainer, main);
    this.root.append(shell);
  }

  render() {
    const state = (this.state = getState());
    this.header?.update(state, this.route);
    const searchValue = this.route?.name === 'search' ? this.route.params?.q || '' : '';
    this.header?.setSearchValue(searchValue);
    this.sidebar?.render(state, this.route, this.isSidebarCollapsed);
    this.editor?.setProjects(state.projects);
    this.#renderView();
  }

  #renderView() {
    if (!this.contentContainer) return;
    const renderer = this.#getViewRenderer(this.route?.name);
    this.contentContainer.innerHTML = '';
    const context = {
      state: this.state,
      route: this.route,
      handlers: this.#getViewHandlers(),
    };
    const element = renderer(context);
    this.contentContainer.append(element);
  }

  #setSidebarCollapsed(value) {
    this.isSidebarCollapsed = Boolean(value);
    this.shell?.classList.toggle('is-sidebar-collapsed', this.isSidebarCollapsed);
    this.render();
  }

  #getViewRenderer(name) {
    switch (name) {
      case 'upcoming':
        return (ctx) => renderUpcomingView(ctx);
      case 'project': {
        const routeProjectId = this.route?.params?.id;
        const normalizedProjectId = routeProjectId === 'inbox' ? null : routeProjectId;
        const project = normalizedProjectId
          ? this.state.projects.find((item) => item.id === normalizedProjectId)
          : null;
        return (ctx) => renderProjectView(project, { ...ctx, projectId: normalizedProjectId });
      }
      case 'tag':
        return (ctx) => renderTagView(this.route?.params?.name, ctx);
      case 'done':
        return (ctx) => renderDoneView(ctx);
      case 'calendar':
        return (ctx) => renderCalendarView(ctx);
      case 'search':
        return (ctx) => renderSearchView(this.route?.params?.q, ctx);
      case 'today':
      default:
        return (ctx) => renderTodayView(ctx);
    }
  }

  #openTaskEditor(task = null, defaults = null) {
    const context = defaults ?? this.#getRouteDefaults();
    this.editor?.open(task, context);
  }

  #handleTaskSubmit(data, task) {
    if (task) {
      updateTask(task.id, data);
    } else {
      addTask(data);
    }
  }

  #handleQuickAdd(data = {}) {
    if (!data.title) return;
    const defaults = this.#getRouteDefaults();
    const payload = { ...defaults, ...data };
    if (defaults?.tags?.length && !data.tags) {
      payload.tags = [...defaults.tags];
    }
    addTask(payload);
  }

  #handleToggleTask(task, checked) {
    toggleTaskDone(task.id, checked);
  }

  #handleTaskDelete(task) {
    if (!task) return;
    if (confirm('Удалить задачу?')) {
      deleteTask(task.id);
    }
  }

  #handleTaskReorder(taskId, index, projectId = null) {
    const targetProjectId =
      projectId ?? (this.route?.name === 'project' ? this.route.params?.id || null : null);
    reorderTask(taskId, index, targetProjectId);
  }

  #handleProjectCreate(data) {
    const name = data?.name?.trim();
    if (!name) return;
    addProject({ name, color: data.color });
  }

  #handleProjectEdit(project) {
    if (!project) return;
    const name = prompt('Название проекта', project.name);
    if (!name) return;
    const color = prompt('Цвет проекта (#RRGGBB, опционально)', project.color || '') || project.color;
    updateProject(project.id, { name, color });
  }

  #handleProjectDelete(project) {
    if (!project) return;
    const confirmation = confirm(`Удалить проект «${project.name}»?`);
    if (!confirmation) return;
    deleteProject(project.id);
  }

  #handleProjectReorder(projectId, index) {
    reorderProject(projectId, index);
  }

  #handleReminder(task) {
    this.#showInAppReminder(task);
  }

  #showInAppReminder(task) {
    if (!this.notificationsContainer) return;
    const banner = document.createElement('div');
    banner.className = 'reminder-banner';

    const text = document.createElement('div');
    text.className = 'reminder-banner__text';
    text.textContent = `Напоминание: ${task.title}`;

    if (task.dueAt) {
      const meta = document.createElement('span');
      meta.className = 'reminder-banner__meta';
      const parts = [formatDueDate(task.dueAt, task.isAllDay)];
      if (!task.isAllDay) {
        parts.push(formatTimeLabel(task.dueAt, this.state.settings.timeFormat));
      }
      meta.textContent = parts.filter(Boolean).join(' · ');
      text.append(document.createElement('br'), meta);
    }

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'reminder-banner__close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => banner.remove());

    banner.append(text, closeButton);
    this.notificationsContainer.append(banner);
    setTimeout(() => {
      banner.remove();
    }, 8000);
  }

  #handleClearCompleted(projectId) {
    clearCompletedTasks(projectId);
  }

  #getViewHandlers() {
    return {
      quickAdd: (payload) => this.#handleQuickAdd(payload),
      toggleTask: (task, checked) => this.#handleToggleTask(task, checked),
      editTask: (task) => this.#openTaskEditor(task),
      deleteTask: (task) => this.#handleTaskDelete(task),
      reorderTask: (taskId, index, projectId) => this.#handleTaskReorder(taskId, index, projectId),
      clearCompleted: (projectId) => this.#handleClearCompleted(projectId),
      setDoneFilter: (projectId) => this.#setDoneFilter(projectId),
      createTask: (payload) => this.#openTaskEditor(null, payload),
      updateTask: (task, updates) => {
        if (!task) return;
        updateTask(task.id, updates);
      },
    };
  }

  #getRouteDefaults() {
    const route = this.route;
    if (!route) return {};
    switch (route.name) {
      case 'project':
        return { projectId: route.params?.id || null };
      case 'tag':
        return route.params?.name ? { tags: [route.params.name] } : {};
      case 'today':
        return {
          dueAt: this.#buildDateISO(0),
          isAllDay: true,
        };
      case 'upcoming':
        return {
          dueAt: this.#buildDateISO(1),
          isAllDay: true,
        };
      default:
        return {};
    }
  }

  #buildDateISO(offsetDays = 0) {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    if (offsetDays) {
      date.setDate(date.getDate() + offsetDays);
    }
    return toLocalISOString(date);
  }

  #setDoneFilter(projectId) {
    const params = {};
    if (projectId && projectId.length > 0) {
      params.project = projectId;
    }
    navigate({ name: 'done', params });
  }

  #bindKeyboardShortcuts() {
    if (typeof document === 'undefined') return;
    document.addEventListener('keydown', (event) => {
      const target = event.target;

      if (event.key === 'Escape' && this.route?.name === 'search') {
        event.preventDefault();
        this.header?.setSearchValue('');
        this.#handleSearch('');
        return;
      }
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        this.header?.focusSearch();
        return;
      }

      if (
        !isTyping &&
        !this.editor?.isOpen &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'n'
      ) {
        event.preventDefault();
        this.#openTaskEditor(null, this.#getRouteDefaults());
      }
    });
  }

  #handleSearch(value) {
    const query = value.trim();
    if (query) {
      navigate({ name: 'search', params: { q: query } });
    } else if (this.route?.name === 'search') {
      navigate({ name: 'today' });
    }
  }

  #handleToggleTimeFormat() {
    const current = this.state.settings?.timeFormat || '24h';
    const next = current === '24h' ? '12h' : '24h';
    updateSettings({ timeFormat: next });
  }

  #restoreFocus() {
    this.headerContainer?.querySelector('input[type="search"]')?.focus();
  }
}
