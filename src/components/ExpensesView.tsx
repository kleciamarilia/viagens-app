"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatBRL, formatDate } from "@/lib/format";
import type { Expense, ExpenseCategory } from "@/lib/database.types";

const CURRENCIES = ["BRL", "EUR", "USD", "GBP"];

export default function ExpensesView({
  tripId,
  categories,
  expenses,
}: {
  tripId: string;
  categories: ExpenseCategory[];
  expenses: Expense[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Expense[]>(expenses);
  const [formOpen, setFormOpen] = useState(false);

  const categoryById = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const total = useMemo(() => list.reduce((sum, e) => sum + Number(e.amount_brl), 0), [list]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of list) {
      const key = e.category_id ?? "sem-categoria";
      map.set(key, (map.get(key) ?? 0) + Number(e.amount_brl));
    }
    return [...map.entries()]
      .map(([categoryId, value]) => ({ categoryId, value, category: categoryById.get(categoryId) }))
      .sort((a, b) => b.value - a.value);
  }, [list, categoryById]);

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
        total: items.reduce((s, e) => s + Number(e.amount_brl), 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [list]);

  async function addExpense(values: {
    description: string;
    category_id: string;
    expense_date: string;
    amount: number;
    currency: string;
    amount_brl: number;
    payment_method: string;
  }) {
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

  async function removeExpense(expense: Expense) {
    setList((prev) => prev.filter((e) => e.id !== expense.id));
    await supabase.from("expenses").delete().eq("id", expense.id);
  }

  return (
    <div className="space-y-6">
      <section className="grid sm:grid-cols-[220px_1fr] gap-4">
        <div className="rounded-xl border border-border bg-primary-dark text-white p-5 flex flex-col justify-center">
          <span className="text-xs uppercase tracking-wide text-white/70">Custo total</span>
          <span className="text-2xl font-semibold mt-1">{formatBRL(total)}</span>
          <span className="text-xs text-white/70 mt-1">{list.length} lançamento(s)</span>
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
          <AddExpenseForm categories={categories} onAdd={addExpense} />
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
                  {group.items.map((expense) => {
                    const cat = expense.category_id ? categoryById.get(expense.category_id) : undefined;
                    return (
                      <li key={expense.id} className="group flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary-soft/50 transition">
                        <span className="w-8 shrink-0 text-center">{cat?.emoji ?? "🔖"}</span>
                        <span className="flex-1 min-w-0 truncate">{expense.description}</span>
                        {expense.payment_method && (
                          <span className="text-xs text-muted hidden sm:inline shrink-0">
                            {expense.payment_method}
                          </span>
                        )}
                        {expense.currency !== "BRL" && (
                          <span className="text-xs text-muted shrink-0">
                            {expense.currency} {Number(expense.amount).toFixed(2)}
                          </span>
                        )}
                        <span className="font-medium w-24 text-right shrink-0">
                          {formatBRL(Number(expense.amount_brl))}
                        </span>
                        <button
                          onClick={() => removeExpense(expense)}
                          className="text-muted hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition shrink-0"
                          aria-label="remover"
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AddExpenseForm({
  categories,
  onAdd,
}: {
  categories: ExpenseCategory[];
  onAdd: (values: {
    description: string;
    category_id: string;
    expense_date: string;
    amount: number;
    currency: string;
    amount_brl: number;
    payment_method: string;
  }) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [amountBrl, setAmountBrl] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

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

    onAdd({
      description: description.trim(),
      category_id: categoryId,
      expense_date: date,
      amount: amt,
      currency,
      amount_brl: amtBrl,
      payment_method: paymentMethod.trim(),
    });

    setDescription("");
    setAmount("");
    setAmountBrl("");
    setPaymentMethod("");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-surface p-4 grid sm:grid-cols-6 gap-3 items-end shadow-sm"
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

      {currency !== "BRL" && (
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

      <div className={currency !== "BRL" ? "sm:col-span-2" : "sm:col-span-3"}>
        <label className="block text-[11px] font-medium text-muted mb-0.5">Forma de pagamento</label>
        <input
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          placeholder="opcional — Ex: Cartão Nubank"
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <button
          type="submit"
          className="w-full rounded-lg bg-primary text-white text-sm font-medium px-3 py-1.5 hover:bg-primary-dark transition"
        >
          Adicionar
        </button>
      </div>
    </form>
  );
}
