"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, formatWeekday } from "@/lib/format";
import type { ItineraryDay } from "@/lib/database.types";

export default function ItineraryDayCard({ day }: { day: ItineraryDay }) {
  const supabase = createClient();
  const [values, setValues] = useState({
    city: day.city ?? "",
    lodging_name: day.lodging_name ?? "",
    lodging_link: day.lodging_link ?? "",
    transport: day.transport ?? "",
    notes: day.notes ?? "",
  });
  const [saved, setSaved] = useState(true);

  function update<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  }

  async function save() {
    await supabase
      .from("itinerary_days")
      .update({
        city: values.city || null,
        lodging_name: values.lodging_name || null,
        lodging_link: values.lodging_link || null,
        transport: values.transport || null,
        notes: values.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", day.id);
    setSaved(true);
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="text-center shrink-0 w-14">
          <div className="text-xs text-muted uppercase">{formatWeekday(day.date)}</div>
          <div className="text-lg font-semibold text-primary-dark leading-tight">
            {formatDate(day.date)}
          </div>
          <div className="text-[11px] text-muted">dia {day.day_number}</div>
        </div>

        <div className="flex-1 grid sm:grid-cols-2 gap-3">
          <Field
            label="Cidade / pernoite"
            value={values.city}
            onChange={(v) => update("city", v)}
            onBlur={save}
            placeholder="Ex: Munique"
          />
          <Field
            label="Deslocamento"
            value={values.transport}
            onChange={(v) => update("transport", v)}
            onBlur={save}
            placeholder="Ex: trem Munique → Bamberg, 1h30"
          />
          <Field
            label="Hospedagem"
            value={values.lodging_name}
            onChange={(v) => update("lodging_name", v)}
            onBlur={save}
            placeholder="Nome do hotel/Airbnb"
          />
          <Field
            label="Link da hospedagem"
            value={values.lodging_link}
            onChange={(v) => update("lodging_link", v)}
            onBlur={save}
            placeholder="https://…"
          />
          <div className="sm:col-span-2">
            <Field
              label="Notas do dia"
              value={values.notes}
              onChange={(v) => update("notes", v)}
              onBlur={save}
              placeholder="Anotações livres sobre o dia"
              textarea
            />
          </div>
        </div>

        <div className="w-4 text-right shrink-0">
          {!saved && <span className="text-[10px] text-accent">●</span>}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  const cls =
    "w-full rounded-lg border border-transparent hover:border-border focus:border-primary bg-transparent focus:bg-white px-2 py-1 text-sm outline-none transition";
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted mb-0.5">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={2}
          className={cls}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}
