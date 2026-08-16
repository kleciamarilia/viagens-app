import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import TopBar from "@/components/TopBar";
import TripTabs from "@/components/TripTabs";
import { formatDateFull, daysBetween } from "@/lib/format";
import type { Trip } from "@/lib/database.types";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();

  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).single();

  if (!trip) notFound();
  const t = trip as Trip;

  return (
    <>
      <TopBar />
      <main className="max-w-5xl mx-auto px-4 py-6 w-full flex-1">
        <Link href="/trips" className="text-sm text-muted hover:text-primary">
          ← todas as viagens
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-3xl">{t.emoji}</span>
          <div>
            <h1 className="text-xl font-semibold">{t.name}</h1>
            <p className="text-sm text-muted">
              {formatDateFull(t.start_date)} — {formatDateFull(t.end_date)} ·{" "}
              {daysBetween(t.start_date, t.end_date)} dias
            </p>
          </div>
        </div>
        <TripTabs tripId={t.id} />
        <div className="pt-6">{children}</div>
      </main>
    </>
  );
}
