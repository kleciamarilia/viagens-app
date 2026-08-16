"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, formatWeekday, formatBRL } from "@/lib/format";
import type {
  Activity,
  ActivityStatus,
  ActivityType,
  ActivityVoucher,
  Expense,
  ExpenseCategory,
} from "@/lib/database.types";

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
  vouchers,
  categories,
  expenses,
}: {
  tripId: string;
  days: AgendaDay[];
  activities: Activity[];
  vouchers: ActivityVoucher[];
  categories: ExpenseCategory[];
  expenses: Expense[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Activity[]>(activities);
  const [voucherList, setVoucherList] = useState<ActivityVoucher[]>(vouchers);
  const [expenseList, setExpenseList] = useState<Expense[]>(expenses);
  const [formOpenFor, setFormOpenFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const vouchersByActivity = useMemo(() => {
    const map = new Map<string, ActivityVoucher[]>();
    for (const v of voucherList) {
      const arr = map.get(v.activity_id) ?? [];
      arr.push(v);
      map.set(v.activity_id, arr);
    }
    return map;
  }, [voucherList]);

  const expenseByActivity = useMemo(() => {
    const map = new Map<string, Expense>();
    for (const e of expenseList) {
      if (e.activity_id) map.set(e.activity_id, e);
    }
    return map;
  }, [expenseList]);

  const categoryById = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  async function addActivity(
    day: AgendaDay,
    values: { title: string; type: ActivityType; time: string; location: string; cost: { categoryId: string; amount: number } | null }
  ) {
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
      const activity = data as Activity;
      setList((prev) => [...prev, activity]);
      setFormOpenFor(null);

      if (values.cost) {
        await createLinkedExpense(activity, values.cost.categoryId, values.cost.amount);
      }
    }
  }

  async function createLinkedExpense(activity: Activity, categoryId: string, amount: number) {
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        trip_id: tripId,
        activity_id: activity.id,
        category_id: categoryId || null,
        description: activity.title,
        expense_date: activity.date,
        amount,
        currency: "BRL",
        amount_brl: amount,
      })
      .select()
      .single();
    if (!error && data) {
      setExpenseList((prev) => [...prev, data as Expense]);
    }
  }

  async function removeLinkedExpense(expense: Expense) {
    setExpenseList((prev) => prev.filter((e) => e.id !== expense.id));
    await supabase.from("expenses").delete().eq("id", expense.id);
  }

  async function saveActivity(id: string, patch: Partial<Activity>) {
    setList((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    await supabase.from("activities").update(patch).eq("id", id);
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

  async function addVoucher(activityId: string, file: File) {
    const path = `${activityId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("vouchers").upload(path, file);
    if (uploadError) return;

    const { data: urlData } = supabase.storage.from("vouchers").getPublicUrl(path);
    const { data, error } = await supabase
      .from("activity_vouchers")
      .insert({
        activity_id: activityId,
        file_name: file.name,
        file_path: path,
        file_url: urlData.publicUrl,
      })
      .select()
      .single();

    if (!error && data) {
      setVoucherList((prev) => [...prev, data as ActivityVoucher]);
    }
  }

  async function removeVoucher(voucher: ActivityVoucher) {
    setVoucherList((prev) => prev.filter((v) => v.id !== voucher.id));
    await supabase.storage.from("vouchers").remove([voucher.file_path]);
    await supabase.from("activity_vouchers").delete().eq("id", voucher.id);
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
              {dayActivities.map((activity) =>
                editingId === activity.id ? (
                  <li key={activity.id} className="rounded-lg border border-border bg-primary-soft/30 p-3">
                    <EditActivityForm
                      activity={activity}
                      vouchers={vouchersByActivity.get(activity.id) ?? []}
                      expense={expenseByActivity.get(activity.id) ?? null}
                      categories={categories}
                      categoryById={categoryById}
                      onSave={(patch) => {
                        saveActivity(activity.id, patch);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                      onAddVoucher={(file) => addVoucher(activity.id, file)}
                      onRemoveVoucher={removeVoucher}
                      onAddCost={(categoryId, amount) => createLinkedExpense(activity, categoryId, amount)}
                      onRemoveCost={removeLinkedExpense}
                    />
                  </li>
                ) : (
                  <li
                    key={activity.id}
                    className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-primary-soft/60 transition cursor-pointer"
                    onClick={() => setEditingId(activity.id)}
                  >
                    <span className="text-base shrink-0">{typeInfo(activity.type).emoji}</span>
                    {activity.time && (
                      <span className="text-xs text-muted font-mono w-11 shrink-0">
                        {activity.time.slice(0, 5)}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div>
                        <span className="text-sm">{activity.title}</span>
                        {activity.location && (
                          <span className="text-xs text-muted ml-2">📍 {activity.location}</span>
                        )}
                        {(vouchersByActivity.get(activity.id)?.length ?? 0) > 0 && (
                          <span className="text-xs text-muted ml-2">📎 {vouchersByActivity.get(activity.id)!.length}</span>
                        )}
                        {expenseByActivity.has(activity.id) && (
                          <span className="text-xs text-muted ml-2">
                            💰 {formatBRL(Number(expenseByActivity.get(activity.id)!.amount_brl))}
                          </span>
                        )}
                      </div>
                      {activity.notes && (
                        <div className="text-xs text-muted/90 mt-0.5 whitespace-pre-wrap break-words">
                          📝 {activity.notes}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleStatus(activity);
                      }}
                      className={`text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0 ${STATUS_STYLE[activity.status]}`}
                    >
                      {activity.status}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeActivity(activity);
                      }}
                      className="text-muted hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition shrink-0 px-1"
                      aria-label="remover"
                    >
                      ✕
                    </button>
                  </li>
                )
              )}
            </ul>

            {formOpenFor === day.date && (
              <AddActivityForm
                categories={categories}
                onAdd={(values) => addActivity(day, values)}
                onCancel={() => setFormOpenFor(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CostFields({
  categories,
  enabled,
  onToggle,
  categoryId,
  onCategoryChange,
  amount,
  onAmountChange,
}: {
  categories: ExpenseCategory[];
  enabled: boolean;
  onToggle: (v: boolean) => void;
  categoryId: string;
  onCategoryChange: (v: string) => void;
  amount: string;
  onAmountChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted cursor-pointer select-none">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        💰 Adicionar custo (soma na aba Despesas)
      </label>
      {enabled && (
        <div className="flex gap-2 mt-1.5">
          <select
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="Valor em R$"
            className="flex-1 rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white"
          />
        </div>
      )}
    </div>
  );
}

function EditActivityForm({
  activity,
  vouchers,
  expense,
  categories,
  categoryById,
  onSave,
  onCancel,
  onAddVoucher,
  onRemoveVoucher,
  onAddCost,
  onRemoveCost,
}: {
  activity: Activity;
  vouchers: ActivityVoucher[];
  expense: Expense | null;
  categories: ExpenseCategory[];
  categoryById: Map<string, ExpenseCategory>;
  onSave: (patch: Partial<Activity>) => void;
  onCancel: () => void;
  onAddVoucher: (file: File) => void;
  onRemoveVoucher: (voucher: ActivityVoucher) => void;
  onAddCost: (categoryId: string, amount: number) => void;
  onRemoveCost: (expense: Expense) => void;
}) {
  const [title, setTitle] = useState(activity.title);
  const [type, setType] = useState<ActivityType>(activity.type);
  const [time, setTime] = useState(activity.time ? activity.time.slice(0, 5) : "");
  const [location, setLocation] = useState(activity.location ?? "");
  const [notes, setNotes] = useState(activity.notes ?? "");
  const [uploading, setUploading] = useState(false);
  const [costEnabled, setCostEnabled] = useState(false);
  const [costCategoryId, setCostCategoryId] = useState(categories[0]?.id ?? "");
  const [costAmount, setCostAmount] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      type,
      time: time || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    });
    if (costEnabled && !expense) {
      const amt = parseFloat(costAmount.replace(",", "."));
      if (!Number.isNaN(amt) && amt > 0) onAddCost(costCategoryId, amt);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onAddVoucher(file);
    setUploading(false);
    e.target.value = "";
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[11px] font-medium text-muted mb-0.5">O quê</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-muted mb-0.5">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
            className="rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white"
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
            className="rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[11px] font-medium text-muted mb-0.5">Local</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="opcional"
            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-muted mb-0.5">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="opcional"
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-muted mb-1">Vouchers / ingressos</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {vouchers.map((v) => (
            <a
              key={v.id}
              href={v.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/voucher flex items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-1 text-xs hover:border-primary transition"
            >
              📎 <span className="max-w-[140px] truncate">{v.file_name}</span>
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveVoucher(v);
                }}
                className="text-muted hover:text-red-600 opacity-0 group-hover/voucher:opacity-100 transition"
              >
                ✕
              </span>
            </a>
          ))}
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-dark border border-dashed border-border rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-primary-soft transition">
          {uploading ? "Enviando…" : "+ anexar arquivo"}
          <input type="file" onChange={handleFile} className="hidden" disabled={uploading} />
        </label>
      </div>

      <div>
        {expense ? (
          <div className="flex items-center gap-1.5 text-xs font-medium bg-white border border-border rounded-lg px-2.5 py-1.5 w-fit">
            <span>{categoryById.get(expense.category_id ?? "")?.emoji ?? "💰"}</span>
            <span>{formatBRL(Number(expense.amount_brl))}</span>
            <span className="text-muted">lançado nas despesas</span>
            <button
              type="button"
              onClick={() => onRemoveCost(expense)}
              className="text-muted hover:text-red-600 ml-1"
            >
              ✕
            </button>
          </div>
        ) : (
          <CostFields
            categories={categories}
            enabled={costEnabled}
            onToggle={setCostEnabled}
            categoryId={costCategoryId}
            onCategoryChange={setCostCategoryId}
            amount={costAmount}
            onAmountChange={setCostAmount}
          />
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="rounded-lg bg-primary text-white text-sm font-medium px-3 py-1.5 hover:bg-primary-dark transition"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted hover:text-foreground px-2 py-1.5"
        >
          cancelar
        </button>
      </div>
    </form>
  );
}

function AddActivityForm({
  categories,
  onAdd,
  onCancel,
}: {
  categories: ExpenseCategory[];
  onAdd: (values: {
    title: string;
    type: ActivityType;
    time: string;
    location: string;
    cost: { categoryId: string; amount: number } | null;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityType>("atracao");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [costEnabled, setCostEnabled] = useState(false);
  const [costCategoryId, setCostCategoryId] = useState(categories[0]?.id ?? "");
  const [costAmount, setCostAmount] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    let cost: { categoryId: string; amount: number } | null = null;
    if (costEnabled) {
      const amt = parseFloat(costAmount.replace(",", "."));
      if (!Number.isNaN(amt) && amt > 0) cost = { categoryId: costCategoryId, amount: amt };
    }

    onAdd({ title: title.trim(), type, time, location: location.trim(), cost });
    setTitle("");
    setTime("");
    setLocation("");
    setCostEnabled(false);
    setCostAmount("");
  }

  return (
    <form onSubmit={submit} className="mt-3 pt-3 border-t border-border space-y-2.5">
      <div className="flex flex-wrap gap-2 items-end">
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
      </div>

      <CostFields
        categories={categories}
        enabled={costEnabled}
        onToggle={setCostEnabled}
        categoryId={costCategoryId}
        onCategoryChange={setCostCategoryId}
        amount={costAmount}
        onAmountChange={setCostAmount}
      />

      <div className="flex gap-2">
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
      </div>
    </form>
  );
}
