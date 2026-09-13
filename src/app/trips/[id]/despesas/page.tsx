import { createClient } from "@/lib/supabase";
import ExpensesView from "@/components/ExpensesView";
import type { Expense, ExpenseCategory, Trip } from "@/lib/database.types";

export default async function DespesasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: trip }, { data: categories }, { data: expenses }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", id).single(),
    supabase.from("expense_categories").select("*").order("sort_order"),
    supabase.from("expenses").select("*").eq("trip_id", id).order("expense_date", { ascending: false }),
  ]);

  return (
    <ExpensesView
      tripId={id}
      eurRate={(trip as Trip | null)?.eur_rate ?? null}
      categories={(categories ?? []) as ExpenseCategory[]}
      expenses={(expenses ?? []) as Expense[]}
    />
  );
}
