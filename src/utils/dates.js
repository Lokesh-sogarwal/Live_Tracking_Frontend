// Calendar date (YYYY-MM-DD) in the browser's local timezone. Schedule dates are
// local calendar days; toISOString() would give the UTC day, which is the previous
// day for local midnight in IST (and before 05:30 every morning).
export const toLocalYYYYMMDD = (value = new Date()) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
