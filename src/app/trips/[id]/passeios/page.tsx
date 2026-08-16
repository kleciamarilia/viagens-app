import { createClient } from "@/lib/supabase";
import AgendaView from "@/components/AgendaView";
import { buildDayRange, cityForDate } from "@/lib/itinerary";
import type { Activity, ActivityVoucher, Expense, ExpenseCategory, Stay, Trip } from "@/lib/database.types";

export default async function PasseiosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();

  const [{ data: trip }, { data: stays }, { data: activities }, { data: categories }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", id).single(),
    supabase.from("stays").select("*").eq("trip_id", id).order("start_date"),
    supabase
      .from("activities")
      .select("*")
      .eq("trip_id", id)
      .order("date")
      .order("time", { nullsFirst: false }),
    supabase.from("expense_categories").select("*").order("sort_order"),
  ]);

  const activityList = (activities ?? []) as Activity[];
  const activityIds = activityList.map((a) => a.id);

  const [{ data: vouchers }, { data: linkedExpenses }] = await Promise.all([
    activityIds.length > 0
      ? supabase.from("activity_vouchers").select("*").in("activity_id", activityIds)
      : Promise.resolve({ data: [] as ActivityVoucher[] }),
    activityIds.length > 0
      ? supabase.from("expenses").select("*").in("activity_id", activityIds)
      : Promise.resolve({ data: [] as Expense[] }),
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
    <AgendaView
      tripId={id}
      days={days}
      activities={activityList}
      vouchers={(vouchers ?? []) as ActivityVoucher[]}
      categories={(categories ?? []) as ExpenseCategory[]}
      expenses={(linkedExpenses ?? []) as Expense[]}
    />
  );
}
