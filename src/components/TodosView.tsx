"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import type { Todo } from "@/lib/database.types";

export default function TodosView({
  tripId,
  todos,
}: {
  tripId: string;
  todos: Todo[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Todo[]>(todos);
  const [formOpen, setFormOpen] = useState(false);

  const pending = useMemo(() => list.filter((t) => !t.done), [list]);
  const done = useMemo(() => list.filter((t) => t.done), [list]);

  async function addTodo(values: { title: string; due_date: string; notes: string }) {
    const { data, error } = await supabase
      .from("todos")
      .insert({
        trip_id: tripId,
        title: values.title,
        due_date: values.due_date || null,
        notes: values.notes || null,
      })
      .select()
      .single();

    if (!error && data) {
      setList((prev) => [...prev, data as Todo]);
      setFormOpen(false);
    }
  }

  async function toggleDone(todo: Todo) {
    setList((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t))
    );
    await supabase.from("todos").update({ done: !todo.done }).eq("id", todo.id);
  }

  async function removeTodo(todo: Todo) {
    setList((prev) => prev.filter((t) => t.id !== todo.id));
    await supabase.from("todos").delete().eq("id", todo.id);
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
            Providências a tomar
          </h3>
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="text-xs font-medium text-primary hover:text-primary-dark border border-border rounded-lg px-2.5 py-1 hover:bg-primary-soft transition"
          >
            {formOpen ? "cancelar" : "+ providência"}
          </button>
        </div>

        {formOpen && <AddTodoForm onAdd={addTodo} />}

        {list.length === 0 && !formOpen && (
          <p className="text-sm text-muted italic p-4 mt-3 rounded-xl border border-border bg-surface">
            Nenhuma providência ainda — coisas como reservas, ingressos ou documentos a organizar
            antes da viagem.
          </p>
        )}

        {pending.length > 0 && (
          <ul className="mt-3 rounded-xl border border-border bg-surface shadow-sm divide-y divide-border overflow-hidden">
            {pending.map((todo) => (
              <TodoItem key={todo.id} todo={todo} onToggle={toggleDone} onRemove={removeTodo} />
            ))}
          </ul>
        )}

        {done.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5 px-1">
              Concluídas
            </h4>
            <ul className="rounded-xl border border-border bg-surface shadow-sm divide-y divide-border overflow-hidden opacity-60">
              {done.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onToggle={toggleDone} onRemove={removeTodo} />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function TodoItem({
  todo,
  onToggle,
  onRemove,
}: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onRemove: (todo: Todo) => void;
}) {
  return (
    <li className="group flex items-start gap-3 px-4 py-2.5 text-sm hover:bg-primary-soft/50 transition">
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => onToggle(todo)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)] cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <p className={`truncate ${todo.done ? "line-through text-muted" : ""}`}>{todo.title}</p>
        {(todo.due_date || todo.notes) && (
          <p className="text-xs text-muted mt-0.5">
            {todo.due_date && <span>até {formatDate(todo.due_date)}</span>}
            {todo.due_date && todo.notes && <span> · </span>}
            {todo.notes && <span>{todo.notes}</span>}
          </p>
        )}
      </div>
      <button
        onClick={() => onRemove(todo)}
        className="text-muted hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition shrink-0"
        aria-label="remover"
      >
        ✕
      </button>
    </li>
  );
}

function AddTodoForm({
  onAdd,
}: {
  onAdd: (values: { title: string; due_date: string; notes: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), due_date: dueDate, notes: notes.trim() });
    setTitle("");
    setDueDate("");
    setNotes("");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-surface p-4 grid sm:grid-cols-6 gap-3 items-end shadow-sm"
    >
      <div className="sm:col-span-3">
        <label className="block text-[11px] font-medium text-muted mb-0.5">O que precisa fazer</label>
        <input
          autoFocus
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Reservar Giesinger Bräustüberl"
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="sm:col-span-1">
        <label className="block text-[11px] font-medium text-muted mb-0.5">Até quando</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="block text-[11px] font-medium text-muted mb-0.5">Notas</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="opcional"
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
