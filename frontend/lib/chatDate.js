const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const calendarDaysBetween = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / MS_PER_DAY);

export const isSameCalendarDay = (a, b) => {
  const first = toDate(a);
  const second = toDate(b);
  if (!first || !second) return false;
  return calendarDaysBetween(first, second) === 0;
};

export const shouldShowDayDivider = (current, previous) => {
  const currentDate = toDate(current);
  if (!currentDate) return false;
  const previousDate = toDate(previous);
  if (!previousDate) return true;
  return !isSameCalendarDay(currentDate, previousDate);
};

export const formatDayLabel = (value) => {
  const date = toDate(value);
  if (!date) return '';

  const diff = calendarDaysBetween(new Date(), date);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatMessageTime = (value) => {
  const date = toDate(value);
  if (!date) return '';
  return date
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();
};

export const formatFullTimestamp = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const day = date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${day} at ${formatMessageTime(date)}`;
};

export const formatConversationWhen = (value) => {
  const date = toDate(value);
  if (!date) return '';

  const diff = calendarDaysBetween(new Date(), date);
  if (diff === 0) return formatMessageTime(date);
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default {
  calendarDaysBetween,
  isSameCalendarDay,
  shouldShowDayDivider,
  formatDayLabel,
  formatMessageTime,
  formatFullTimestamp,
  formatConversationWhen,
};
