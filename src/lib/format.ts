export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDate(dateStr: string, opts?: Intl.DateTimeFormatOptions) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("pt-BR", opts ?? { day: "2-digit", month: "short" }).format(date);
}

export function formatDateFull(dateStr: string) {
  return formatDate(dateStr, { day: "2-digit", month: "long", year: "numeric" });
}

export function formatWeekday(dateStr: string) {
  return formatDate(dateStr, { weekday: "short" }).replace(".", "");
}

export function formatDateWeekdayLong(dateStr: string) {
  return formatDate(dateStr, { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

export function daysBetween(startISO: string, endISO: string) {
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ey, em, ed] = endISO.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

export function daysUntil(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
