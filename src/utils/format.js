import { parseDate, isToday, isSameDay } from './dates.js';

const TIME_FORMATTERS = {
  '24h': new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
  '12h': new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }),
};

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export function formatDueDate(value, isAllDay = false) {
  const date = parseDate(value);
  if (!date) return '';
  if (isToday(value)) {
    return isAllDay ? 'Сегодня (весь день)' : 'Сегодня';
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(date, tomorrow)) {
    return 'Завтра';
  }
  return DATE_FORMATTER.format(date);
}

export function formatTimeLabel(value, format = '24h') {
  const date = parseDate(value);
  if (!date) return '';
  const formatter = TIME_FORMATTERS[format] || TIME_FORMATTERS['24h'];
  return formatter.format(date);
}

export function formatDateHeading(value) {
  const date = parseDate(value);
  if (!date) return 'Без срока';
  if (isToday(value)) return 'Сегодня';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(date, tomorrow)) return 'Завтра';
  return DATE_FORMATTER.format(date);
}
