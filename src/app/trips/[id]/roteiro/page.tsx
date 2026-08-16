import { createClient } from "@/lib/supabase";
import StaysView from "@/components/StaysView";
import type { Stay } from "@/lib/database.types";

export default async function RoteiroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();

  const { data: stays } = await supabase
    .from("stays")
    .select("*")
    .eq("trip_id", id)
    .order("start_date", { ascending: true });

  return <StaysView tripId={id} stays={(stays ?? []) as Stay[]} />;
}
