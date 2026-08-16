import type { ItineraryDay } from "@/lib/database.types";

export interface CityStay {
  city: string;
  days: ItineraryDay[];
}

export function groupByCity(days: ItineraryDay[]): CityStay[] {
  const groups: CityStay[] = [];
  for (const day of days) {
    const city = (day.city ?? "").trim();
    const current = groups[groups.length - 1];
    if (current && current.city === city) {
      current.days.push(day);
    } else {
      groups.push({ city, days: [day] });
    }
  }
  return groups;
}
