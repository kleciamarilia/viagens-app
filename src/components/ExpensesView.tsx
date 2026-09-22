"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatBRL, formatDate } from "@/lib/format";
import type { Expense, ExpenseCategory } from "@/lib/database.types";

const CURRENCIES = ["EUR", "BRL", "USD", "GBP"];

export default function ExpensesView({
  tripId,
  eurRate,
  categories,
  expenses,
}: {
  tripId: string;
  eurRate: number | null;
  categories: ExpenseCategory[];
  expenses: Expense[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Expense[]>(expenses);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rateInput, setRateInput] = useState(eurRate ? String(eurRate).replace(".", ",") : "");
  const [savingRate, setSavingRate] = useState(false);

  const rate = useMemo(() => {
    const v = parseFloat(rateInput.replace(",", "."));
    return !Number.isNaN(v) && v > 0 ? v : null;
  }, [rateInput]);

  function brlValue(expense: Expense) {
    if (expense.currency === "EUR" && rate) return Number(expense.amount) * rate;
    return Number(expense.amount_brl);
  }

  async function saveRate() {
    setSavingRate(true);
    await supabase.from("trips").update({ eur_rate: rate }).eq("id", tripId);
    setSavingRate(false);
  }

  const categoryById = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const total = useMemo(() => list.reduce((sum, e) => sum + brlValue(e), 0), [list, rate]); // eslint-disable-line react-hooks/exhaustive-deps

  const unconvertedCount = useMemo(
    () => (rate ? 0 : list.filter((e) => e.currency === "EUR").length),
    [list, rate]
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of list) {
      const key = e.category_id ?? "sem-categoria";
      map.set(key, (map.get(key) ?? 0) + brlValue(e));
    }
    return [...map.entries()]
      .map(([categoryId, value]) => ({ categoryId, value, category: categoryById.get(categoryId) }))
      .sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, categoryById, rate]);

  const byDate = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of list) {
      const arr = map.get(e.expense_date) ?? [];
      arr.push(e);
      map.set(e.expense_date, arr);
    }
    return [...map.entries()]
      .map(([date, items]) => ({
        date,
        items,
        total: items.reduce((s, e) => s + brlValue(e), 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, rate]);

  type ExpenseFormValues = {
    description: string;
    category_id: string;
    expense_date: string;
    amount: number;
    currency: string;
    amount_brl: number;
    payment_method: string;
  };

  async function addExpense(values: ExpenseFormValues) {
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        trip_id: tripId,
        category_id: values.category_id || null,
        description: values.description,
        expense_date: values.expense_date,
        amount: values.amount,
        currency: values.currency,
        amount_brl: values.amount_brl,
        payment_method: values.payment_method || null,
      })
      .select()
      .single();

    if (!error && data) {
      setList((prev) => [data as Expense, ...prev]);
      setFormOpen(false);
    }
  }

  async function updateExpense(expense: Expense, values: ExpenseFormValues) {
    const patch = {
      category_id: values.category_id || null,
      description: values.description,
      expense_date: values.expense_date,
      amount: values.amount,
      currency: values.currency,
      amount_brl: values.amount_brl,
      payment_method: values.payment_method || null,
    };
    setList((prev) => prev.map((e) => (e.id === expense.id ? { ...e, ...patch } : e)));
    setEditingId(null);
    await supabase.from("expenses").update(patch).eq("id", expense.id);
  }

  async function removeExpense(expense: Expense) {
    setList((prev) => prev.filter((e) => e.id !== expense.id));
    await supabase.from("expenses").delete().eq("id", expense.id);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-muted uppercase tracking-wide">
          Cotação usada
        </span>
        <span className="text-sm text-muted">1 € =</span>
        <span className="flex items-center gap-1">
          <span className="text-sm text-muted">R$</span>
          <input
            inputMode="decimal"
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
            onBlur={saveRate}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            placeholder="5,94"
            className="w-20 rounded-lg border border-border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </span>
        {savingRate && <span className="text-xs text-muted">salvando…</span>}
        {!rate && (
          <span className="text-xs text-muted italic">
            defina a cotação pra converter os lançamentos em € automaticamente
          </span>
        )}
      </section>

      <section className="grid sm:grid-cols-[220px_1fr] gap-4">
        <div className="rounded-xl border border-border bg-primary-dark text-white p-5 flex flex-col justify-center">
          <span className="text-xs uppercase tracking-wide text-white/70">Custo total</span>
          <span className="text-2xl font-semibold mt-1">{formatBRL(total)}</span>
          <span className="text-xs text-white/70 mt-1">{list.length} lançamento(s)</span>
          {unconvertedCount > 0 && (
            <span className="text-xs text-amber-200 mt-2 leading-snug">
              ⚠️ {unconvertedCount} lançamento(s) em € sem cotação definida — este total ainda não reflete o valor real em R$
            </span>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Por categoria
          </h3>
          {byCategory.length === 0 && (
            <p className="text-sm text-muted italic">Nenhuma despesa lançada ainda.</p>
          )}
          <div className="space-y-2">
            {byCategory.map(({ categoryId, value, category }) => {
              const pct = total > 0 ? (value / total) * 100 : 0;
              return (
                <div key={categoryId} className="flex items-center gap-2 text-sm">
                  <span className="w-40 shrink-0 flex items-center gap-1.5 truncate">
                    <span>{category?.emoji ?? "🔖"}</span>
                    <span className="truncate">{category?.name ?? "Sem categoria"}</span>
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-primary-soft overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: category?.color ?? "#8a7f9c" }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-muted">{formatBRL(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">Lançamentos</h3>
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="text-xs font-medium text-primary hover:text-primary-dark border border-border rounded-lg px-2.5 py-1 hover:bg-primary-soft transition"
          >
            {formOpen ? "cancelar" : "+ despesa"}
          </button>
        </div>

        {formOpen && (
          <ExpenseForm categories={categories} onSubmit={addExpense} onCancel={() => setFormOpen(false)} />
        )}

        {list.length === 0 && (
          <p className="text-sm text-muted italic p-4 mt-3 rounded-xl border border-border bg-surface">
            Nenhuma despesa ainda — adicione custos antes da viagem (passagem, hotel, seguro) ou durante a viagem.
          </p>
        )}

        <div className="mt-3 space-y-4">
          {byDate.map((group) => (
            <div key={group.date}>
              <div className="flex items-baseline justify-between px-1 mb-1.5">
                <h4 className="text-sm font-semibold text-primary-dark">{formatDate(group.date)}</h4>
                <span className="text-xs text-muted">{formatBRL(group.total)}</span>
              </div>
              <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
                <ul className="divide-y divide-border">
                  {group.items.map((expense) =>
                    editingId === expense.id ? (
                      <li key={expense.id} className="p-3 bg-primary-soft/30">
                        <ExpenseForm
                          categories={categories}
                          initial={expense}
                          onSubmit={(values) => updateExpense(expense, values)}
                          onCancel={() => setEditingId(null)}
                        />
                      </li>
                    ) : (
                      <li
                        key={expense.id}
                        className="group flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary-soft/50 transition cursor-pointer"
                        onClick={() => setEditingId(expense.id)}
                      >
                        <span className="w-8 shrink-0 text-center">
                          {(expense.category_id ? categoryById.get(expense.category_id) : undefined)?.emoji ?? "🔖"}
                        </span>
                        <span className="flex-1 min-w-0 truncate">{expense.description}</span>
                        {expense.payment_method && (
                          <span className="text-xs text-muted hidden sm:inline shrink-0">
                            {expense.payment_method}
                          </span>
                        )}
                        <span className="font-medium w-20 text-right shrink-0">
                          {expense.currency === "EUR"
                            ? `€ ${Number(expense.amount).toFixed(2)}`
                            : formatBRL(Number(expense.amount))}
                        </span>
                        <span className="text-xs text-muted w-24 text-right shrink-0">
                          {expense.currency === "EUR" && !rate ? "sem cotação" : `≈ ${formatBRL(brlValue(expense))}`}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeExpense(expense);
                          }}
                          className="text-muted hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition shrink-0"
                          aria-label="remover"
                        >
                          ✕
                        </button>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ExpenseForm({
  categories,
  initial,
  onSubmit,
  onCancel,
}: {
  categories: ExpenseCategory[];
  initial?: Expense;
  onSubmit: (values: {
    description: string;
    category_id: string;
    expense_date: string;
    amount: number;
    currency: string;
    amount_brl: number;
    payment_method: string;
  }) => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? categories[0]?.id ?? "");
  const [date, setDate] = useState(initial?.expense_date ?? today);
  const [amount, setAmount] = useState(initial ? String(initial.amount).replace(".", ",") : "");
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [amountBrl, setAmountBrl] = useState(
    initial && initial.currency !== "EUR" && initial.currency !== "BRL"
      ? String(initial.amount_brl).replace(".", ",")
      : ""
  );
  const [paymentMethod, setPaymentMethod] = useState(initial?.payment_method ?? "");

  function handleAmountChange(v: string) {
    setAmount(v);
    if (currency === "BRL") setAmountBrl(v);
  }

  function handleCurrencyChange(v: string) {
    setCurrency(v);
    if (v === "BRL") setAmountBrl(amount);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount.replace(",", "."));
    const amtBrl = parseFloat((amountBrl || amount).replace(",", "."));
    if (!description.trim() || Number.isNaN(amt) || Number.isNaN(amtBrl)) return;

    onSubmit({
      description: description.trim(),
      category_id: categoryId,
      expense_date: date,
      amount: amt,
      currency,
      amount_brl: amtBrl,
      payment_method: paymentMethod.trim(),
    });

    if (!initial) {
      setDescription("");
      setAmount("");
      setAmountBrl("");
      setPaymentMethod("");
    }
  }

  const needsBrlField = currency !== "BRL" && currency !== "EUR";

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-surface p-4 grid sm:grid-cols-6 gap-3 items-end shadow-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sm:col-span-2">
        <label className="block text-[11px] font-medium text-muted mb-0.5">Descrição</label>
        <input
          autoFocus
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Hotel em Bamberg"
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-muted mb-0.5">Categoria</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-muted mb-0.5">Data</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-muted mb-0.5">Moeda</label>
        <select
          value={currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-muted mb-0.5">Valor</label>
        <input
          required
          inputMode="decimal"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="0,00"
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {needsBrlField && (
        <div>
          <label className="block text-[11px] font-medium text-muted mb-0.5">Valor em R$</label>
          <input
            required
            inputMode="decimal"
            value={amountBrl}
            onChange={(e) => setAmountBrl(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}

      <div className={needsBrlField ? "sm:col-span-2" : "sm:col-span-3"}>
        <label className="block text-[11px] font-medium text-muted mb-0.5">Forma de pagamento</label>
        <input
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          placeholder="opcional — Ex: Cartão Nubank"
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-primary text-white text-sm font-medium px-3 py-1.5 hover:bg-primary-dark transition"
        >
          {initial ? "Salvar" : "Adicionar"}
        </button>
        {initial && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted hover:text-foreground px-2 py-1.5"
          >
            cancelar
          </button>
        )}
      </div>
    </form>
  );
}
