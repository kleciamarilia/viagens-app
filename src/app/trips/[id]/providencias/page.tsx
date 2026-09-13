import { createClient } from "@/lib/supabase";
import TodosView from "@/components/TodosView";
import type { Todo } from "@/lib/database.types";

export default async function ProvidenciasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();

  const { data: todos } = await supabase
    .from("todos")
    .select("*")
    .eq("trip_id", id)
    .order("created_at", { ascending: true });

  return <TodosView tripId={id} todos={(todos ?? []) as Todo[]} />;
}
