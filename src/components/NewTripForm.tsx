"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { pickTripColor } from "@/lib/tripStyle";

const EMOJIS = ["✈️", "🏔️", "🏖️", "🍺", "🗺️", "🚂", "🏰", "🌍"];

export default function NewTripForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [emoji, setEmoji] = useState("✈️");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("trips")
      .insert({
        name,
        destination: destination || null,
        start_date: startDate,
        end_date: endDate,
        emoji,
        color: pickTripColor(name || destination),
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    setName("");
    setDestination("");
    setStartDate("");
    setEndDate("");
    onDone?.();
    router.refresh();
    if (data) router.push(`/trips/${data.id}/roteiro`);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-primary text-white font-medium px-4 py-3 flex items-center justify-center gap-2 hover:bg-primary-dark transition shadow-sm"
      >
        <span className="text-lg leading-none">+</span>
        Adicionar novo destino
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary-dark">Nova viagem</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted text-sm hover:text-foreground"
        >
          cancelar
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {EMOJIS.map((em) => (
          <button
            type="button"
            key={em}
            onClick={() => setEmoji(em)}
            className={`text-lg w-9 h-9 rounded-lg flex items-center justify-center transition ${
              emoji === em ? "bg-primary-soft ring-2 ring-primary" : "hover:bg-primary-soft"
            }`}
          >
            {em}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Nome da viagem</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Alemanha Cervejeira"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Destino</label>
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Ex: Alemanha"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Início</label>
          <input
            required
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fim</label>
          <input
            required
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary text-white py-2.5 text-sm font-medium hover:bg-primary-dark transition disabled:opacity-60"
      >
        {loading ? "Criando…" : "Criar viagem"}
      </button>
    </form>
  );
}
