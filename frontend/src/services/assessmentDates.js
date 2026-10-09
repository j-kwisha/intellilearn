export function toApiDate(value, endOfDay = false) {
  if (!value) return null;
  const local = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${endOfDay ? '23:59:59' : '00:00:00'}` : value;
  return new Date(local).toISOString();
}

export function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function assessmentPublication(form) {
  return Boolean(form.available_from || form.is_published);
}
