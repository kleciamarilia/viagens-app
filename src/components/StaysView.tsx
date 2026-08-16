"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDateRange } from "@/lib/format";
import type { Stay } from "@/lib/database.types";

export default function StaysView({ tripId, stays }: { tripId: string; stays: Stay[] }) {
  const supabase = createClient();
  const [list, setList] = useState<Stay[]>(
    [...stays].sort((a, b) => a.start_date.localeCompare(b.start_date))
  );
  const [addOpen, setAddOpen] = useState(false);

  async function addStay(values: {
    city: string;
    start_date: string;
    end_date: string;
    lodging_name: string;
    lodging_link: string;
    transport: string;
  }) {
    const { data, error } = await supabase
      .from("stays")
      .insert({
        trip_id: tripId,
        city: values.city,
        start_date: values.start_date,
        end_date: values.end_date,
        lodging_name: values.lodging_name || null,
        lodging_link: values.lodging_link || null,
        transport: values.transport || null,
      })
      .select()
      .single();

    if (!error && data) {
      setList((prev) =>
        [...prev, data as Stay].sort((a, b) => a.start_date.localeCompare(b.start_date))
      );
      setAddOpen(false);
    }
  }

  async function updateStay(id: string, patch: Partial<Stay>) {
    setList((prev) =>
      prev
        .map((s) => (s.id === id ? { ...s, ...patch } : s))
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
    );
    await supabase
      .from("stays")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function removeStay(id: string) {
    setList((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("stays").delete().eq("id", id);
  }

  if (list.length === 0 && !addOpen) {
    return (
      <div className="text-center py-10">
        <p className="text-muted text-sm mb-4">Nenhuma estadia cadastrada ainda.</p>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-dark transition"
        >
          + Adicionar primeira estadia
        </button>
      </div>
    );
  }

  return (
    <div>
      {list.map((stay, i) => (
        <div key={stay.id}>
          <StayCard stay={stay} onSave={(patch) => updateStay(stay.id, patch)} onDelete={() => removeStay(stay.id)} />
          {i < list.length - 1 && (
            <div className="flex justify-center py-1">
              <span className="text-xl text-primary/50">↓</span>
            </div>
          )}
        </div>
      ))}

      <div className="mt-4">
        {addOpen ? (
          <AddStayForm onAdd={addStay} onCancel={() => setAddOpen(false)} />
        ) : (
          <button
            onClick={() => setAddOpen(true)}
            className="w-full rounded-xl border-2 border-dashed border-border text-muted hover:border-primary hover:text-primary transition px-4 py-3 text-sm font-medium"
          >
            + Adicionar estadia
          </button>
        )}
      </div>
    </div>
  );
}

function StayCard({
  stay,
  onSave,
  onDelete,
}: {
  stay: Stay;
  onSave: (patch: Partial<Stay>) => void;
  onDelete: () => void;
}) {
  const [values, setValues] = useState({
    city: stay.city,
    start_date: stay.start_date,
    end_date: stay.end_date,
    lodging_name: stay.lodging_name ?? "",
    lodging_link: stay.lodging_link ?? "",
    transport: stay.transport ?? "",
    notes: stay.notes ?? "",
  });
  const [saved, setSaved] = useState(true);

  function update<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  }

  function save() {
    onSave({
      city: values.city,
      start_date: values.start_date,
      end_date: values.end_date,
      lodging_name: values.lodging_name || null,
      lodging_link: values.lodging_link || null,
      transport: values.transport || null,
      notes: values.notes || null,
    });
    setSaved(true);
  }

  return (
    <div className="group rounded-xl border border-border bg-surface shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg shrink-0">📍</span>
          <input
            value={values.city}
            onChange={(e) => update("city", e.target.value)}
            onBlur={save}
            className="font-semibold text-lg text-primary-dark bg-transparent outline-none border-b border-transparent hover:border-border focus:border-primary flex-1 min-w-0"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!saved && <span className="text-[10px] text-accent">●</span>}
          <button
            onClick={onDelete}
            className="text-muted hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition"
            aria-label="remover estadia"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex gap-2 items-center">
          <Field
            label="Data de entrada"
            type="date"
            value={values.start_date}
            onChange={(v) => update("start_date", v)}
            onBlur={save}
          />
          <Field
            label="Data de saída"
            type="date"
            value={values.end_date}
            onChange={(v) => update("end_date", v)}
            onBlur={save}
          />
        </div>
        <Field
          label="Deslocamento até aqui"
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
            label="Notas"
            value={values.notes}
            onChange={(v) => update("notes", v)}
            onBlur={save}
            placeholder="Anotações livres sobre essa estadia"
            textarea
          />
        </div>
      </div>

      <p className="text-xs text-muted mt-3">{formatDateRange(values.start_date, values.end_date)}</p>
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
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
  textarea?: boolean;
  type?: string;
}) {
  const cls =
    "w-full rounded-lg border border-transparent hover:border-border focus:border-primary bg-transparent focus:bg-white px-2 py-1 text-sm outline-none transition";
  return (
    <div className="flex-1">
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
          type={type ?? "text"}
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

function AddStayForm({
  onAdd,
  onCancel,
}: {
  onAdd: (values: {
    city: string;
    start_date: string;
    end_date: string;
    lodging_name: string;
    lodging_link: string;
    transport: string;
  }) => void;
  onCancel: () => void;
}) {
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lodgingName, setLodgingName] = useState("");
  const [lodgingLink, setLodgingLink] = useState("");
  const [transport, setTransport] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim() || !startDate || !endDate) return;
    onAdd({
      city: city.trim(),
      start_date: startDate,
      end_date: endDate || startDate,
      lodging_name: lodgingName.trim(),
      lodging_link: lodgingLink.trim(),
      transport: transport.trim(),
    });
    setCity("");
    setStartDate("");
    setEndDate("");
    setLodgingName("");
    setLodgingLink("");
    setTransport("");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary-dark">Nova estadia</h3>
        <button type="button" onClick={onCancel} className="text-muted text-sm hover:text-foreground">
          cancelar
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Cidade</label>
        <input
          autoFocus
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ex: Bamberg"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Entrada</label>
          <input
            required
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Saída</label>
          <input
            required
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Deslocamento até aqui</label>
        <input
          value={transport}
          onChange={(e) => setTransport(e.target.value)}
          placeholder="opcional — Ex: trem Munique → Bamberg, 1h30"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Hospedagem</label>
          <input
            value={lodgingName}
            onChange={(e) => setLodgingName(e.target.value)}
            placeholder="opcional"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Link</label>
          <input
            value={lodgingLink}
            onChange={(e) => setLodgingLink(e.target.value)}
            placeholder="opcional"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-primary text-white py-2.5 text-sm font-medium hover:bg-primary-dark transition"
      >
        Adicionar estadia
      </button>
    </form>
  );
}
