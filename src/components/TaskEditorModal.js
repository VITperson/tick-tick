import { TagPicker } from './TagPicker.js';
import { DateTimePicker } from './DateTimePicker.js';
import { DEFAULT_DURATION_MINUTES } from '../models/task.js';

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Низкий' },
  { value: 2, label: 'Обычный' },
  { value: 3, label: 'Высокий' },
];

export class TaskEditorModal {
  constructor({ onSubmit, onDelete, onClose } = {}) {
    this.onSubmit = onSubmit;
    this.onDelete = onDelete;
    this.onClose = onClose;
    this.projects = [];
    this.tagPicker = new TagPicker();
    this.datePicker = new DateTimePicker();
    this.element = this.#createElement();
    document.body.appendChild(this.element);
  }

  setProjects(projects = []) {
    this.projects = projects;
    this.#syncProjectOptions();
  }

  #createElement() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hidden';

    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    const form = document.createElement('form');
    form.className = 'task-editor';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.name = 'title';
    titleInput.placeholder = 'Название задачи';
    titleInput.required = true;

    const descriptionInput = document.createElement('textarea');
    descriptionInput.name = 'description';
    descriptionInput.placeholder = 'Описание';
    descriptionInput.rows = 3;

    const projectLabel = document.createElement('label');
    projectLabel.className = 'task-editor__row';
    const projectTitle = document.createElement('span');
    projectTitle.textContent = 'Проект';
    const projectSelect = document.createElement('select');
    projectLabel.append(projectTitle, projectSelect);

    const priorityLabel = document.createElement('label');
    priorityLabel.className = 'task-editor__row';
    const priorityTitle = document.createElement('span');
    priorityTitle.textContent = 'Приоритет';
    const prioritySelect = document.createElement('select');
    PRIORITY_OPTIONS.forEach((option) => {
      const node = document.createElement('option');
      node.value = String(option.value);
      node.textContent = option.label;
      prioritySelect.append(node);
    });
    priorityLabel.append(priorityTitle, prioritySelect);

    const reminderLabel = document.createElement('label');
    reminderLabel.className = 'task-editor__row';
    const reminderTitle = document.createElement('span');
    reminderTitle.textContent = 'Напоминание';
    const reminderInput = document.createElement('input');
    reminderInput.type = 'datetime-local';
    reminderLabel.append(reminderTitle, reminderInput);

    const durationLabel = document.createElement('label');
    durationLabel.className = 'task-editor__row';
    const durationTitle = document.createElement('span');
    durationTitle.textContent = 'Длительность (мин)';
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.min = '5';
    durationInput.step = '5';
    durationInput.value = String(DEFAULT_DURATION_MINUTES);
    durationLabel.append(durationTitle, durationInput);

    const subtasksSection = document.createElement('section');
    subtasksSection.className = 'task-editor__subtasks';
    const subtasksHeader = document.createElement('div');
    subtasksHeader.className = 'task-editor__subtasks-header';
    const subtasksTitle = document.createElement('span');
    subtasksTitle.textContent = 'Подзадачи';
    const addSubtaskButton = document.createElement('button');
    addSubtaskButton.type = 'button';
    addSubtaskButton.textContent = 'Добавить';
    addSubtaskButton.addEventListener('click', () => this.#addSubtaskRow());
    subtasksHeader.append(subtasksTitle, addSubtaskButton);
    const subtasksContainer = document.createElement('div');
    subtasksContainer.className = 'task-editor__subtasks-list';
    subtasksSection.append(subtasksHeader, subtasksContainer);

    const footer = document.createElement('div');
    footer.className = 'task-editor__actions';

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.textContent = 'Сохранить';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Отмена';
    cancelButton.addEventListener('click', () => this.close());

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Удалить';
    deleteButton.addEventListener('click', () => {
      if (this.task) {
        this.onDelete?.(this.task);
      }
      this.close();
    });

    footer.append(saveButton, cancelButton, deleteButton);

    form.append(
      titleInput,
      descriptionInput,
      projectLabel,
      priorityLabel,
      this.tagPicker.render(),
      this.datePicker.render(),
      durationLabel,
      reminderLabel,
      subtasksSection,
      footer,
    );

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = this.#collectFormData();
      this.onSubmit?.(data, this.task);
      this.close();
    });

    dialog.append(form);
    overlay.append(dialog);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (this.isOpen && event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
    });

    this.form = form;
    this.titleInput = titleInput;
    this.descriptionInput = descriptionInput;
    this.projectSelect = projectSelect;
    this.prioritySelect = prioritySelect;
    this.reminderInput = reminderInput;
    this.durationInput = durationInput;
    this.subtasksContainer = subtasksContainer;
    this.deleteButton = deleteButton;
    return overlay;
  }

  #syncProjectOptions() {
    if (!this.projectSelect) return;
    while (this.projectSelect.firstChild) {
      this.projectSelect.removeChild(this.projectSelect.firstChild);
    }

    const inboxOption = document.createElement('option');
    inboxOption.value = '';
    inboxOption.textContent = 'Без проекта';
    this.projectSelect.append(inboxOption);

    this.projects
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((project) => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        this.projectSelect.append(option);
      });
  }

  #collectFormData() {
    const dueInfo = this.datePicker.getValue();
    const reminderValue = this.reminderInput.value ? new Date(this.reminderInput.value).toISOString() : null;
    const durationValue = Number(this.durationInput?.value);

    return {
      title: this.titleInput.value,
      description: this.descriptionInput.value,
      projectId: this.projectSelect.value || null,
      tags: this.tagPicker.getValue(),
      dueAt: dueInfo.dueAt,
      isAllDay: dueInfo.isAllDay,
      reminderAt: reminderValue,
      priority: Number(this.prioritySelect.value) || 2,
      duration: Number.isFinite(durationValue) && durationValue > 0 ? durationValue : DEFAULT_DURATION_MINUTES,
      subtasks: this.#collectSubtasks(),
    };
  }

  #collectSubtasks() {
    const rows = Array.from(this.subtasksContainer.querySelectorAll('.subtask-row'));
    return rows
      .map((row) => {
        const titleInput = row.querySelector('input[type="text"]');
        const doneCheckbox = row.querySelector('input[type="checkbox"]');
        const title = titleInput?.value.trim();
        if (!title) return null;
        return {
          id: row.dataset.id || undefined,
          title,
          done: Boolean(doneCheckbox?.checked),
        };
      })
      .filter(Boolean);
  }

  #addSubtaskRow(subtask = { id: '', title: '', done: false }) {
    const row = document.createElement('div');
    row.className = 'subtask-row';
    row.dataset.id = subtask.id || '';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(subtask.done);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Название подзадачи';
    input.value = subtask.title || '';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => row.remove());

    row.append(checkbox, input, removeButton);
    this.subtasksContainer.append(row);
  }

  #setSubtasks(subtasks = []) {
    this.subtasksContainer.innerHTML = '';
    if (!subtasks.length) {
      this.#addSubtaskRow();
      return;
    }
    subtasks.forEach((subtask) => this.#addSubtaskRow(subtask));
  }

  open(task, defaults = {}) {
    this.task = task || null;
    this.defaults = defaults || {};
    this.isOpen = true;
    this.form.reset();
    this.tagPicker.setValue([]);
    this.datePicker.setValue();
    this.reminderInput.value = '';
    this.durationInput.value = String(DEFAULT_DURATION_MINUTES);
    this.#setSubtasks([]);
    this.deleteButton.disabled = !task;

    if (task) {
      this.titleInput.value = task.title || '';
      this.descriptionInput.value = task.description || '';
      this.projectSelect.value = task.projectId || '';
      this.prioritySelect.value = String(task.priority || 2);
      this.tagPicker.setValue(task.tags || []);
      this.datePicker.setValue({ dueAt: task.dueAt, isAllDay: task.isAllDay });
      this.reminderInput.value = task.reminderAt ? this.#toInputDate(task.reminderAt) : '';
      this.durationInput.value = String(task.duration ?? DEFAULT_DURATION_MINUTES);
      this.#setSubtasks(task.subtasks || []);
    } else {
      this.projectSelect.value = defaults.projectId || '';
      if (defaults.tags) {
        this.tagPicker.setValue(defaults.tags);
      }
      if (defaults.dueAt || defaults.isAllDay) {
        this.datePicker.setValue({ dueAt: defaults.dueAt, isAllDay: defaults.isAllDay });
      }
      if (defaults.priority) {
        this.prioritySelect.value = String(defaults.priority);
      } else {
        this.prioritySelect.value = '2';
      }
      if (defaults.reminderAt) {
        this.reminderInput.value = this.#toInputDate(defaults.reminderAt);
      }
      if (defaults.duration) {
        this.durationInput.value = String(defaults.duration);
      }
      this.#setSubtasks([]);
    }

    this.element.classList.remove('hidden');
    this.titleInput.focus();
  }

  #toInputDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  close() {
    this.isOpen = false;
    this.element.classList.add('hidden');
    this.onClose?.();
  }
}
