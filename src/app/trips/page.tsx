import Link from "next/link";
import { createClient } from "@/lib/supabase";
import TopBar from "@/components/TopBar";
import NewTripForm from "@/components/NewTripForm";
import { daysUntil, formatDateWeekdayLong } from "@/lib/format";
import { flagForDestination } from "@/lib/tripStyle";
import type { Trip } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const supabase = createClient();

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (trips ?? []) as Trip[];

  return (
    <>
      <TopBar />
      <main className="max-w-2xl mx-auto px-4 py-8 w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary-dark mb-1">Minhas viagens</h1>
          <p className="text-muted text-sm">Roteiro, calendário de passeios e custos de cada viagem</p>
        </div>

        <NewTripForm />

        {list.length === 0 && (
          <p className="text-muted text-sm text-center py-8">
            Nenhuma viagem cadastrada ainda. Adicione seu próximo destino acima.
          </p>
        )}

        <div className="space-y-3">
          {list.map((trip) => (
            <TripBar key={trip.id} trip={trip} />
          ))}
        </div>
      </main>
    </>
  );
}

function TripBar({ trip }: { trip: Trip }) {
  const until = daysUntil(trip.start_date);
  const today = new Date().toISOString().slice(0, 10);
  const flag = flagForDestination(trip.destination) ?? "";

  let badge: string;
  if (trip.end_date < today) badge = "concluída";
  else if (until <= 0) badge = "em andamento";
  else badge = `${until}`;

  const badgeUnit = badge !== "concluída" && badge !== "em andamento" ? "dias" : "";

  return (
    <Link
      href={`/trips/${trip.id}/roteiro`}
      className="flex items-stretch rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:brightness-105 transition"
      style={{ background: trip.color }}
    >
      <div className="flex items-center justify-center w-16 shrink-0 text-3xl bg-black/10">
        {trip.emoji}
      </div>
      <div className="flex-1 min-w-0 px-4 py-3 text-white">
        <div className="font-bold text-lg leading-tight truncate">
          {trip.name} {flag}
        </div>
        <div className="text-sm text-white/85 truncate">{formatDateWeekdayLong(trip.start_date)}</div>
      </div>
      <div className="flex flex-col items-center justify-center px-5 bg-black/10 shrink-0 min-w-[84px]">
        <span className="text-2xl font-extrabold text-white leading-none">{badge}</span>
        {badgeUnit && <span className="text-xs text-white/85">{badgeUnit}</span>}
      </div>
    </Link>
  );
}
