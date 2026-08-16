import { createClient } from "@/lib/supabase";
import ExpensesView from "@/components/ExpensesView";
import type { Expense, ExpenseCategory } from "@/lib/database.types";

export default async function DespesasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: categories }, { data: expenses }] = await Promise.all([
    supabase.from("expense_categories").select("*").order("sort_order"),
    supabase.from("expenses").select("*").eq("trip_id", id).order("expense_date", { ascending: false }),
  ]);

  return (
    <ExpensesView
      tripId={id}
      categories={(categories ?? []) as ExpenseCategory[]}
      expenses={(expenses ?? []) as Expense[]}
    />
  );
}
