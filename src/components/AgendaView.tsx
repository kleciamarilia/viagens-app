"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, formatWeekday } from "@/lib/format";
import type { Activity, ActivityStatus, ActivityType } from "@/lib/database.types";

export interface AgendaDay {
  date: string;
  city: string | null;
}

const TYPES: { value: ActivityType; label: string; emoji: string }[] = [
  { value: "atracao", label: "Atração", emoji: "🏛️" },
  { value: "experiencia", label: "Experiência", emoji: "🍻" },
  { value: "comida", label: "Comida", emoji: "🍽️" },
  { value: "transporte", label: "Transporte", emoji: "🚌" },
  { value: "outro", label: "Outro", emoji: "✨" },
];

const STATUS_STYLE: Record<ActivityStatus, string> = {
  planejado: "bg-slate-100 text-slate-600",
  confirmado: "bg-blue-100 text-blue-700",
  concluido: "bg-green-100 text-green-700",
};

const NEXT_STATUS: Record<ActivityStatus, ActivityStatus> = {
  planejado: "confirmado",
  confirmado: "concluido",
  concluido: "planejado",
};

function typeInfo(type: ActivityType) {
  return TYPES.find((t) => t.value === type) ?? TYPES[4];
}

export default function AgendaView({
  tripId,
  days,
  activities,
}: {
  tripId: string;
  days: AgendaDay[];
  activities: Activity[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Activity[]>(activities);
  const [formOpenFor, setFormOpenFor] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of list) {
      const arr = map.get(a.date) ?? [];
      arr.push(a);
      map.set(a.date, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
    }
    return map;
  }, [list]);

  async function addActivity(day: AgendaDay, values: { title: string; type: ActivityType; time: string; location: string }) {
    const { data, error } = await supabase
      .from("activities")
      .insert({
        trip_id: tripId,
        date: day.date,
        time: values.time || null,
        title: values.title,
        type: values.type,
        location: values.location || null,
      })
      .select()
      .single();

    if (!error && data) {
      setList((prev) => [...prev, data as Activity]);
      setFormOpenFor(null);
    }
  }

  async function cycleStatus(activity: Activity) {
    const next = NEXT_STATUS[activity.status];
    setList((prev) => prev.map((a) => (a.id === activity.id ? { ...a, status: next } : a)));
    await supabase.from("activities").update({ status: next }).eq("id", activity.id);
  }

  async function removeActivity(activity: Activity) {
    setList((prev) => prev.filter((a) => a.id !== activity.id));
    await supabase.from("activities").delete().eq("id", activity.id);
  }

  if (days.length === 0) {
    return <p className="text-muted text-sm">Nenhum dia encontrado para essa viagem ainda.</p>;
  }

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const dayActivities = byDate.get(day.date) ?? [];
        return (
          <div key={day.date} className="rounded-xl border border-border bg-surface shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted uppercase">{formatWeekday(day.date)}</span>
                <span className="font-semibold text-primary-dark">{formatDate(day.date)}</span>
                {day.city && <span className="text-sm text-muted">· {day.city}</span>}
              </div>
              <button
                onClick={() => setFormOpenFor(formOpenFor === day.date ? null : day.date)}
                className="text-xs font-medium text-primary hover:text-primary-dark border border-border rounded-lg px-2.5 py-1 hover:bg-primary-soft transition"
              >
                + passeio
              </button>
            </div>

            {dayActivities.length === 0 && formOpenFor !== day.date && (
              <p className="text-xs text-muted italic">Nada planejado ainda.</p>
            )}

            <ul className="space-y-1.5">
              {dayActivities.map((activity) => (
                <li
                  key={activity.id}
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-primary-soft/60 transition"
                >
                  <span className="text-base shrink-0">{typeInfo(activity.type).emoji}</span>
                  {activity.time && (
                    <span className="text-xs text-muted font-mono w-11 shrink-0">
                      {activity.time.slice(0, 5)}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{activity.title}</span>
                    {activity.location && (
                      <span className="text-xs text-muted ml-2">📍 {activity.location}</span>
                    )}
                  </div>
                  <button
                    onClick={() => cycleStatus(activity)}
                    className={`text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0 ${STATUS_STYLE[activity.status]}`}
                  >
                    {activity.status}
                  </button>
                  <button
                    onClick={() => removeActivity(activity)}
                    className="text-muted hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition shrink-0 px-1"
                    aria-label="remover"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            {formOpenFor === day.date && (
              <AddActivityForm onAdd={(values) => addActivity(day, values)} onCancel={() => setFormOpenFor(null)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AddActivityForm({
  onAdd,
  onCancel,
}: {
  onAdd: (values: { title: string; type: ActivityType; time: string; location: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityType>("atracao");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), type, time, location: location.trim() });
    setTitle("");
    setTime("");
    setLocation("");
  }

  return (
    <form onSubmit={submit} className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[140px]">
        <label className="block text-[11px] font-medium text-muted mb-0.5">O quê</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Oktoberfest, tenda Hofbräu"
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-muted mb-0.5">Tipo</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ActivityType)}
          className="rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.emoji} {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-muted mb-0.5">Hora</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="block text-[11px] font-medium text-muted mb-0.5">Local</label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="opcional"
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-primary text-white text-sm font-medium px-3 py-1.5 hover:bg-primary-dark transition"
      >
        Adicionar
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-muted hover:text-foreground px-2 py-1.5"
      >
        cancelar
      </button>
    </form>
  );
}
