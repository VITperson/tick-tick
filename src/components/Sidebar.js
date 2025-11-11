import { navigate } from '../router.js';
import { enableReorder } from '../utils/dnd.js';

const NAV_LINKS = [
  { name: 'today', label: 'Сегодня', icon: '🗓' },
  { name: 'upcoming', label: 'Ближайшие 7 дней', icon: '📅' },
  { name: 'calendar', label: 'Календарь', icon: '📆' },
  { name: 'done', label: 'Выполненные', icon: '✅' },
];

export class Sidebar {
  constructor(
    container,
    {
      onNewTask,
      onProjectCreate,
      onProjectEdit,
      onProjectDelete,
      onProjectReorder,
      onToggleCollapse,
    } = {},
  ) {
    this.container = container;
    this.onNewTask = onNewTask;
    this.onProjectCreate = onProjectCreate;
    this.onProjectEdit = onProjectEdit;
    this.onProjectDelete = onProjectDelete;
    this.onProjectReorder = onProjectReorder;
    this.onToggleCollapse = onToggleCollapse;
    this.isAddingProject = false;
    this.lastState = null;
    this.lastRoute = null;
    this.isCollapsed = false;
  }

  render(state, activeRoute, collapsed = false) {
    this.lastState = state;
    this.lastRoute = activeRoute;
    this.container.innerHTML = '';
    this.container.classList.add('sidebar');
    this.isCollapsed = collapsed;
    this.container.classList.toggle('sidebar--collapsed', collapsed);

    const newTaskButton = document.createElement('button');
    newTaskButton.type = 'button';
    newTaskButton.className = 'sidebar__new-task';
    newTaskButton.textContent = 'Новая задача';
    newTaskButton.addEventListener('click', () => this.onNewTask?.());

    const collapseButton = document.createElement('button');
    collapseButton.type = 'button';
    collapseButton.className = 'sidebar__collapse-btn';
    collapseButton.textContent = collapsed ? '▶' : '◀';
    collapseButton.setAttribute('aria-label', collapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар');
    collapseButton.addEventListener('click', () => this.onToggleCollapse?.(!this.isCollapsed));

    const toolbar = document.createElement('div');
    toolbar.className = 'sidebar__toolbar';
    toolbar.append(collapseButton, newTaskButton);

    const navList = document.createElement('ul');
    navList.className = 'sidebar__nav';
    NAV_LINKS.forEach((link) => {
      const item = document.createElement('li');
      const anchor = document.createElement('a');
      anchor.href = `#/${link.name}`;
      anchor.textContent = `${link.icon} ${link.label}`;
      if (activeRoute?.name === link.name) {
        anchor.setAttribute('aria-current', 'page');
      }
      anchor.addEventListener('click', (event) => {
        event.preventDefault();
        navigate({ name: link.name });
      });
      item.append(anchor);
      navList.append(item);
    });

    const projectsSection = document.createElement('section');
    projectsSection.className = 'sidebar__section';
    const projectsHeader = document.createElement('div');
    projectsHeader.className = 'sidebar__section-header';
    const projectTitle = document.createElement('span');
    projectTitle.textContent = 'Проекты';
    const addProjectButton = document.createElement('button');
    addProjectButton.type = 'button';
    addProjectButton.textContent = this.isAddingProject ? '×' : '+';
    addProjectButton.title = 'Добавить проект';
    addProjectButton.setAttribute(
      'aria-label',
      this.isAddingProject ? 'Закрыть форму проекта' : 'Добавить проект',
    );
    addProjectButton.addEventListener('click', () => {
      this.isAddingProject = !this.isAddingProject;
      this.render(this.lastState, this.lastRoute);
    });
    projectsHeader.append(projectTitle, addProjectButton);
    projectsSection.append(projectsHeader);

    if (this.isAddingProject) {
      projectsSection.append(this.#renderProjectForm());
    }

    const projectsList = document.createElement('ul');
    projectsList.className = 'sidebar__projects';

    const inboxItem = document.createElement('li');
    const inboxLink = document.createElement('a');
    inboxLink.href = '#/project/inbox';
    inboxLink.textContent = 'Без проекта';
    if (activeRoute?.name === 'project' && (activeRoute.params?.id === 'inbox' || activeRoute.params?.id === null)) {
      inboxLink.setAttribute('aria-current', 'page');
    }
    inboxLink.addEventListener('click', (event) => {
      event.preventDefault();
      navigate({ name: 'project', params: { id: 'inbox' } });
    });
    inboxItem.append(inboxLink);
    projectsList.append(inboxItem);

    state.projects
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((project) => {
        const item = document.createElement('li');
        item.dataset.id = project.id;
        item.draggable = true;
        const row = document.createElement('div');
        row.className = 'sidebar__project-row';

        const link = document.createElement('a');
        link.href = `#/project/${encodeURIComponent(project.id)}`;
        link.className = 'sidebar__project-link';
        const colorBadge = document.createElement('span');
        colorBadge.className = 'sidebar__project-color';
        colorBadge.style.background = project.color || 'var(--border)';
        const title = document.createElement('span');
        title.textContent = project.name;
        link.append(colorBadge, title);
        if (activeRoute?.name === 'project' && activeRoute.params?.id === project.id) {
          link.setAttribute('aria-current', 'page');
        }
        link.addEventListener('click', (event) => {
          event.preventDefault();
          navigate({ name: 'project', params: { id: project.id } });
        });

        const actions = document.createElement('div');
        actions.className = 'sidebar__project-actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.title = 'Переименовать проект';
        editButton.textContent = '✎';
        editButton.addEventListener('click', (event) => {
          event.preventDefault();
          this.onProjectEdit?.(project);
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.title = 'Удалить проект';
        deleteButton.textContent = '🗑';
        deleteButton.addEventListener('click', (event) => {
          event.preventDefault();
          this.onProjectDelete?.(project);
        });

        actions.append(editButton, deleteButton);
        row.append(link, actions);
        item.append(row);
        projectsList.append(item);
      });
    projectsSection.append(projectsList);
    if (this.onProjectReorder) {
      enableReorder(projectsList, {
        itemSelector: 'li',
        onReorder: ({ id, index }) => this.onProjectReorder?.(id, index),
      });
    }

    const tagsSection = document.createElement('section');
    tagsSection.className = 'sidebar__section';
    const tagsHeader = document.createElement('div');
    tagsHeader.className = 'sidebar__section-header';
    tagsHeader.textContent = 'Теги';
    tagsSection.append(tagsHeader);

    const tagsList = document.createElement('ul');
    tagsList.className = 'sidebar__tags';
    const tags = collectTags(state.tasks);
    tags.forEach((tag) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#/tag/${encodeURIComponent(tag.name)}`;
      link.textContent = `${tag.name} (${tag.count})`;
      if (activeRoute?.name === 'tag' && activeRoute.params?.name === tag.name) {
        link.setAttribute('aria-current', 'page');
      }
      link.addEventListener('click', (event) => {
        event.preventDefault();
        navigate({ name: 'tag', params: { name: tag.name } });
      });
      item.append(link);
      tagsList.append(item);
    });
    tagsSection.append(tagsList);

    this.container.append(toolbar, navList, projectsSection, tagsSection);
  }

  #renderProjectForm() {
    const form = document.createElement('form');
    form.className = 'sidebar__project-form';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Название проекта';
    nameInput.required = true;

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#2f80ed';
    colorInput.setAttribute('aria-label', 'Цвет проекта');
    colorInput.title = 'Цвет проекта';

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.textContent = 'Добавить';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Отмена';
    cancelButton.addEventListener('click', () => {
      this.isAddingProject = false;
      this.render(this.lastState, this.lastRoute);
    });

    form.append(nameInput, colorInput, saveButton, cancelButton);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = nameInput.value.trim();
      if (!name) return;
      this.onProjectCreate?.({ name, color: colorInput.value });
      this.isAddingProject = false;
      this.render(this.lastState, this.lastRoute);
    });

    return form;
  }
}

function collectTags(tasks = []) {
  const map = new Map();
  tasks.forEach((task) => {
    task.tags?.forEach((tag) => {
      const count = map.get(tag) || 0;
      map.set(tag, count + 1);
    });
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
