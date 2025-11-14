export class TagPicker {
  constructor({ label = 'Теги' } = {}) {
    this.label = label;
    this.tags = [];
    this.availableTags = [];
    this.hideSuggestionsTimeout = null;
    this.element = this.#createElement();
  }

  #createElement() {
    const wrapper = document.createElement('label');
    wrapper.className = 'tag-picker';
    wrapper.setAttribute('data-has-suggestions', 'true');
    const title = document.createElement('span');
    title.textContent = this.label;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Например: Работа, Личное';
    input.addEventListener('input', () => this.#handleInput());
    input.addEventListener('focus', () => {
      this.#renderSuggestions(this.#getLastToken());
      this.#clearHideSuggestions();
    });
    input.addEventListener('blur', () => {
      this.hideSuggestionsTimeout = setTimeout(() => {
        this.#hideSuggestions();
      }, 150);
    });

    const suggestionsList = document.createElement('ul');
    suggestionsList.className = 'tag-picker__suggestions tag-picker__suggestions--hidden';
    suggestionsList.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    this.input = input;
    this.suggestionsList = suggestionsList;
    wrapper.append(title, input, suggestionsList);
    return wrapper;
  }

  #handleInput() {
    const value = this.input.value;
    this.tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const filter = this.#getLastToken();
    this.#renderSuggestions(filter);
  }

  #getLastToken() {
    const segments = this.input.value.split(',');
    const last = segments[segments.length - 1] || '';
    return last.trim().toLowerCase();
  }

  #renderSuggestions(filterTerm) {
    if (!this.input.matches(':focus')) {
      this.#hideSuggestions();
      return;
    }
    const normalizedFilter = filterTerm?.toLowerCase() || '';
    const matches = this.availableTags
      .filter((tag) => !this.tags.includes(tag))
      .filter((tag) => !normalizedFilter || tag.toLowerCase().includes(normalizedFilter))
      .slice(0, 8);

    this.suggestionsList.innerHTML = '';
    if (!matches.length) {
      this.#hideSuggestions();
      return;
    }

    matches.forEach((tag) => {
      const item = document.createElement('li');
      item.textContent = tag;
      item.addEventListener('mousedown', () => {
        this.#clearHideSuggestions();
        this.#selectSuggestion(tag);
      });
      this.suggestionsList.append(item);
    });

    this.#showSuggestions();
  }

  #selectSuggestion(tag) {
    const segments = this.input.value.split(',');
    const prefixSegments = segments
      .slice(0, -1)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const nextValue = prefixSegments.length
      ? `${prefixSegments.join(', ')}, ${tag}`
      : tag;
    this.tags = [...prefixSegments, tag];
    this.input.value = `${nextValue}, `;
    this.#renderSuggestions('');
    this.input.focus();
  }

  #showSuggestions() {
    this.suggestionsList.classList.remove('tag-picker__suggestions--hidden');
  }

  #hideSuggestions() {
    this.suggestionsList.classList.add('tag-picker__suggestions--hidden');
  }

  #clearHideSuggestions() {
    if (this.hideSuggestionsTimeout) {
      clearTimeout(this.hideSuggestionsTimeout);
      this.hideSuggestionsTimeout = null;
    }
  }

  setValue(tags = []) {
    this.tags = Array.isArray(tags) ? tags : [];
    this.input.value = this.tags.join(', ');
    this.#renderSuggestions(this.#getLastToken());
  }

  setSuggestions(tags = []) {
    const normalized = Array.from(
      new Set((Array.isArray(tags) ? tags : []).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }));
    this.availableTags = normalized;
    this.#renderSuggestions(this.#getLastToken());
  }

  getValue() {
    return this.tags;
  }

  render() {
    return this.element;
  }
}
