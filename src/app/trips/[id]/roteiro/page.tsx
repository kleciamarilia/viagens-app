import { createClient } from "@/lib/supabase";
import ItineraryDayCard from "@/components/ItineraryDayCard";
import { groupByCity } from "@/lib/itinerary";
import { formatDateRange } from "@/lib/format";
import type { ItineraryDay } from "@/lib/database.types";

export default async function RoteiroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();

  const { data: days } = await supabase
    .from("itinerary_days")
    .select("*")
    .eq("trip_id", id)
    .order("date", { ascending: true });

  const list = (days ?? []) as ItineraryDay[];

  if (list.length === 0) {
    return (
      <p className="text-muted text-sm">
        Nenhum dia encontrado para essa viagem ainda.
      </p>
    );
  }

  const stays = groupByCity(list);

  return (
    <div className="space-y-6">
      {stays.map((stay, i) => (
        <div key={stay.days[0].id}>
          <div className="flex items-baseline gap-2 mb-2 px-1">
            <span className="text-base">📍</span>
            <h3 className="font-semibold text-primary-dark">
              {stay.city || "Sem cidade definida"}
            </h3>
            <span className="text-sm text-muted">
              {formatDateRange(stay.days[0].date, stay.days[stay.days.length - 1].date)}
            </span>
          </div>
          <div className="space-y-3">
            {stay.days.map((day) => (
              <ItineraryDayCard key={day.id} day={day} />
            ))}
          </div>
          {i < stays.length - 1 && <div className="h-px bg-border mt-6" />}
        </div>
      ))}
    </div>
  );
}
