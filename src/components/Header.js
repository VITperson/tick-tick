export class Header {
  constructor(container, { onSearch, onToggleTimeFormat } = {}) {
    this.container = container;
    this.onSearch = onSearch;
    this.onToggleTimeFormat = onToggleTimeFormat;
    this.#render();
  }

  #render() {
    this.container.classList.add('header');

    const branding = document.createElement('div');
    branding.className = 'header__branding';
    branding.textContent = 'Tick-Tick';

    const searchLabel = document.createElement('label');
    searchLabel.className = 'header__search';
    const labelText = document.createElement('span');
    labelText.className = 'visually-hidden';
    labelText.textContent = 'Поиск задач';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Поиск (Ctrl/Cmd + K)';
    searchInput.addEventListener('input', (event) => {
      this.onSearch?.(event.target.value);
    });

    searchLabel.append(labelText, searchInput);

    const timeToggle = document.createElement('button');
    timeToggle.type = 'button';
    timeToggle.className = 'header__time-toggle';
    timeToggle.textContent = '24h';
    timeToggle.addEventListener('click', () => {
      this.onToggleTimeFormat?.();
    });

    this.searchInput = searchInput;
    this.timeToggle = timeToggle;

    this.container.append(branding, searchLabel, timeToggle);
  }

  update(state) {
    const format = state?.settings?.timeFormat === '12h' ? '12h' : '24h';
    this.timeToggle.textContent = format;
    this.timeToggle.setAttribute('aria-pressed', format === '12h' ? 'true' : 'false');
  }

  setSearchValue(value = '') {
    if (!this.searchInput) return;
    this.searchInput.value = value;
  }

  focusSearch() {
    if (!this.searchInput) return;
    this.searchInput.focus();
    this.searchInput.select();
  }
}
