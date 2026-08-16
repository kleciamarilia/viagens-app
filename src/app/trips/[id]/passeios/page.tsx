import { createClient } from "@/lib/supabase";
import AgendaView from "@/components/AgendaView";
import type { Activity, ItineraryDay } from "@/lib/database.types";

export default async function PasseiosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: days }, { data: activities }] = await Promise.all([
    supabase.from("itinerary_days").select("*").eq("trip_id", id).order("date"),
    supabase
      .from("activities")
      .select("*")
      .eq("trip_id", id)
      .order("date")
      .order("time", { nullsFirst: false }),
  ]);

  return (
    <AgendaView
      tripId={id}
      days={(days ?? []) as ItineraryDay[]}
      activities={(activities ?? []) as Activity[]}
    />
  );
}
