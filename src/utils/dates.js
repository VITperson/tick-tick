const MS_IN_DAY = 24 * 60 * 60 * 1000;

export function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date) {
  const cloned = new Date(date);
  cloned.setHours(0, 0, 0, 0);
  return cloned;
}

export function startOfToday() {
  return startOfDay(new Date());
}

export function isSameDay(dateA, dateB) {
  if (!dateA || !dateB) return false;
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export function isToday(value) {
  const date = parseDate(value);
  if (!date) return false;
  return isSameDay(date, new Date());
}

export function isWithinNextDays(value, days) {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  const diff = date.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  return diff >= 0 && diff <= days * MS_IN_DAY;
}

export function isPast(value) {
  const date = parseDate(value);
  if (!date) return false;
  return date.getTime() < Date.now();
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function getDateKey(value) {
  const date = parseDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toLocalISOString(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function groupByDate(tasks) {
  const groups = new Map();
  tasks.forEach((task) => {
    const key = getDateKey(task.dueAt) || 'none';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(task);
  });
  return groups;
}

export function isBetweenDates(value, start, end) {
  const date = parseDate(value);
  if (!date) return false;
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}
