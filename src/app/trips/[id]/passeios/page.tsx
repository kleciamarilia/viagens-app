import { createClient } from "@/lib/supabase";
import AgendaView from "@/components/AgendaView";
import { buildDayRange, cityForDate } from "@/lib/itinerary";
import type { Activity, Stay, Trip } from "@/lib/database.types";

export default async function PasseiosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();

  const [{ data: trip }, { data: stays }, { data: activities }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", id).single(),
    supabase.from("stays").select("*").eq("trip_id", id).order("start_date"),
    supabase
      .from("activities")
      .select("*")
      .eq("trip_id", id)
      .order("date")
      .order("time", { nullsFirst: false }),
  ]);

  const t = trip as Trip | null;
  const stayList = (stays ?? []) as Stay[];
  const days = t
    ? buildDayRange(t.start_date, t.end_date).map((date) => ({
        date,
        city: cityForDate(stayList, date),
      }))
    : [];

  return (
    <AgendaView tripId={id} days={days} activities={(activities ?? []) as Activity[]} />
  );
}
