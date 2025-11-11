export class TagPicker {
  constructor({ label = 'Теги' } = {}) {
    this.label = label;
    this.tags = [];
    this.element = this.#createElement();
  }

  #createElement() {
    const wrapper = document.createElement('label');
    wrapper.className = 'tag-picker';
    const title = document.createElement('span');
    title.textContent = this.label;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Например: Работа, Личное';
    input.addEventListener('input', () => {
      this.tags = input.value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    });

    this.input = input;
    wrapper.append(title, input);
    return wrapper;
  }

  setValue(tags = []) {
    this.tags = Array.isArray(tags) ? tags : [];
    this.input.value = this.tags.join(', ');
  }

  getValue() {
    return this.tags;
  }

  render() {
    return this.element;
  }
}
