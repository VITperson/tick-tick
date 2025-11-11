import { createTaskItem } from './TaskItem.js';
import { enableReorder } from '../utils/dnd.js';

export class TaskList {
  constructor({ onToggle, onEdit, onDelete } = {}) {
    this.handlers = { onToggle, onEdit, onDelete };
  }

  renderSections(sections = [], options = {}) {
    const container = document.createElement('div');
    container.className = 'task-list';
    const timeFormat = options.timeFormat || '24h';
    const reorderOptions = options.reorder;
    if (!sections.length) {
      container.append(this.#createEmptyState());
      return container;
    }

    sections.forEach((section) => {
      container.append(
        this.#createSection(section, timeFormat, reorderOptions && reorderOptions.enabled ? reorderOptions : null),
      );
    });
    return container;
  }

  #createSection(section, timeFormat, reorderOptions) {
    const block = document.createElement('section');
    block.className = 'task-list__section';
    if (section.title) {
      const header = document.createElement('h3');
      header.textContent = section.title;
      block.append(header);
    }
    const list = document.createElement('ul');
    list.className = 'task-list__items';
    (section.tasks || []).forEach((task) => {
      list.append(createTaskItem(task, { ...this.handlers, timeFormat }));
    });
    block.append(list);
    if (reorderOptions) {
      enableReorder(list, {
        itemSelector: '.task-item',
        onReorder: ({ id, index }) => reorderOptions.onReorder?.(id, index),
      });
    }
    if (!section.tasks?.length && section.emptyMessage) {
      const message = document.createElement('p');
      message.className = 'task-list__empty';
      message.textContent = section.emptyMessage;
      block.append(message);
    }
    return block;
  }

  #createEmptyState() {
    const empty = document.createElement('p');
    empty.className = 'task-list__empty';
    empty.textContent = 'Задачи появятся здесь.';
    return empty;
  }
}
