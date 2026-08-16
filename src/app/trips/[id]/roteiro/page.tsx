import { createClient } from "@/lib/supabase";
import ItineraryDayCard from "@/components/ItineraryDayCard";
import type { ItineraryDay } from "@/lib/database.types";

export default async function RoteiroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

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

  return (
    <div className="space-y-3">
      {list.map((day) => (
        <ItineraryDayCard key={day.id} day={day} />
      ))}
    </div>
  );
}
