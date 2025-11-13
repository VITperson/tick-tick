import { toLocalISOString } from '../utils/dates.js';

export class DateTimePicker {
  constructor({ label = 'Срок' } = {}) {
    this.label = label;
    this.element = this.#createElement();
  }

  #createElement() {
    const wrapper = document.createElement('fieldset');
    wrapper.className = 'datetime-picker';
    const legend = document.createElement('legend');
    legend.textContent = this.label;

    const dateInput = document.createElement('input');
    dateInput.type = 'date';

    const timeInput = document.createElement('input');
    timeInput.type = 'time';

    const allDayLabel = document.createElement('label');
    const allDayCheckbox = document.createElement('input');
    allDayCheckbox.type = 'checkbox';
    const allDayText = document.createElement('span');
    allDayText.textContent = 'Весь день';
    allDayLabel.append(allDayCheckbox, allDayText);

    this.dateInput = dateInput;
    this.timeInput = timeInput;
    this.allDayCheckbox = allDayCheckbox;
    this.allDayCheckbox.addEventListener('change', () => this.#syncTimeState());

    wrapper.append(legend, dateInput, timeInput, allDayLabel);
    return wrapper;
  }

  setValue({ dueAt, isAllDay } = {}) {
    if (dueAt) {
      const date = new Date(dueAt);
      if (!Number.isNaN(date.getTime())) {
        const localIso = toLocalISOString(date);
        this.dateInput.value = localIso.slice(0, 10);
        this.timeInput.value = localIso.slice(11, 16);
      }
    } else {
      this.dateInput.value = '';
      this.timeInput.value = '';
    }
    this.allDayCheckbox.checked = Boolean(isAllDay);
    this.#syncTimeState();
  }

  getValue() {
    const dateValue = this.dateInput.value;
    const timeValue = this.timeInput.value;
    const isAllDay = this.allDayCheckbox.checked;
    if (!dateValue) {
      return { dueAt: null, isAllDay };
    }
    const iso = timeValue ? `${dateValue}T${timeValue}:00` : `${dateValue}T00:00:00`;
    return { dueAt: toLocalISOString(new Date(iso)), isAllDay };
  }

  render() {
    return this.element;
  }

  #syncTimeState() {
    if (!this.timeInput) return;
    this.timeInput.disabled = this.allDayCheckbox.checked;
    if (this.allDayCheckbox.checked) {
      this.timeInput.value = '';
    }
  }
}
