import type { Stay } from "@/lib/database.types";

export function buildDayRange(startISO: string, endISO: string): string[] {
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ey, em, ed] = endISO.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const dates: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`
    );
  }
  return dates;
}

export function cityForDate(stays: Stay[], date: string): string | null {
  const stay = stays.find((s) => date >= s.start_date && date <= s.end_date);
  return stay?.city ?? null;
}
