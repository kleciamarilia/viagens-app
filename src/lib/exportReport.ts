import type { Expense, ExpenseCategory } from "@/lib/database.types";

export interface ReportInput {
  tripName: string;
  startDate: string;
  endDate: string;
  eurRate: number | null;
  expenses: Expense[];
  categories: ExpenseCategory[];
}

interface Row {
  date: string;
  description: string;
  category: string;
  method: string;
  currency: string;
  amount: number;
  brl: number;
}

interface Group {
  key: string;
  count: number;
  eur: number;
  brlOrig: number;
  brl: number;
}

const SEM_FORMA = "(sem forma de pagamento)";

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Data como número de série do Excel (assim SUMIFS/COUNTIFS por dia funcionam em qualquer idioma)
function serial(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
}

function toRows(input: ReportInput): Row[] {
  const cats = new Map(input.categories.map((c) => [c.id, c.name]));
  const rate = input.eurRate ?? 0;
  return [...input.expenses]
    .sort((a, b) => a.expense_date.localeCompare(b.expense_date) || a.created_at.localeCompare(b.created_at))
    .map((e) => ({
      date: e.expense_date,
      description: e.description,
      category: (e.category_id && cats.get(e.category_id)) || "Sem categoria",
      method: e.payment_method || SEM_FORMA,
      currency: e.currency,
      amount: Number(e.amount),
      brl:
        e.currency === "EUR"
          ? Number(e.amount) * rate
          : e.currency === "BRL"
            ? Number(e.amount)
            : Number(e.amount_brl),
    }));
}

function group(rows: Row[], keyOf: (r: Row) => string): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const k = keyOf(r);
    const g = map.get(k) ?? { key: k, count: 0, eur: 0, brlOrig: 0, brl: 0 };
    g.count += 1;
    if (r.currency === "EUR") g.eur += r.amount;
    else if (r.currency === "BRL") g.brlOrig += r.amount;
    g.brl += r.brl;
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

const nf = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur = (v: number) => `€ ${nf.format(v)}`;
const brl = (v: number) => `R$ ${nf.format(v)}`;

function fileBase(input: ReportInput) {
  return `Relatorio_${input.tripName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_")}`;
}

// jsPDF usa fontes padrão (Latin-1): troca símbolos que não existem nelas.
const pdfText = (s: string) => s.replace(/→/g, "->").replace(/[“”]/g, '"').replace(/’/g, "'");

export async function exportPdf(input: ReportInput) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableMod.default;
  const rows = toRows(input);
  const total = rows.reduce((s, r) => s + r.brl, 0);
  const totEur = rows.filter((r) => r.currency === "EUR").reduce((s, r) => s + r.amount, 0);
  const totBrl = rows.filter((r) => r.currency === "BRL").reduce((s, r) => s + r.amount, 0);
  const days = new Set(rows.map((r) => r.date)).size;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const purple: [number, number, number] = [91, 63, 160];
  const soft: [number, number, number] = [237, 231, 246];
  const margin = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...purple);
  doc.text(pdfText(input.tripName), margin, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Relatório de despesas · ${fmtDate(input.startDate)} a ${fmtDate(input.endDate)}`, margin, 74);

  // cartões de resumo
  const cards = [
    ["TOTAL GERAL", brl(total)],
    ["GASTO EM EUROS", eur(totEur)],
    ["GASTO EM REAIS", brl(totBrl)],
    ["MÉDIA POR DIA COM GASTOS", brl(days ? total / days : 0)],
  ];
  const cw = (doc.internal.pageSize.getWidth() - margin * 2 - 3 * 8) / 4;
  cards.forEach(([label, value], i) => {
    const x = margin + i * (cw + 8);
    doc.setFillColor(...soft);
    doc.roundedRect(x, 88, cw, 46, 4, 4, "F");
    doc.setFontSize(7);
    doc.setTextColor(110);
    doc.text(label, x + 8, 102);
    doc.setFontSize(i === 0 ? 13 : 11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(i === 0 ? purple : ([30, 30, 30] as [number, number, number])));
    doc.text(value, x + 8, 122);
    doc.setFont("helvetica", "normal");
  });
  doc.setFontSize(8);
  doc.setTextColor(110);
  const rateTxt = input.eurRate ? `R$ ${input.eurRate.toFixed(4).replace(".", ",")}` : "sem cotação";
  doc.text(`Despesas em euro convertidas a ${rateTxt} por euro. ${rows.length} despesas lançadas.`, margin, 148);

  const head = (first: string) => [[first, "Qtd", "Em EUR", "Em R$ (lançado)", "Total em R$", "%"]];
  const body = (gs: Group[]) => [
    ...gs.map((g) => [
      pdfText(g.key),
      String(g.count),
      eur(g.eur),
      brl(g.brlOrig),
      brl(g.brl),
      `${total ? ((g.brl / total) * 100).toFixed(1).replace(".", ",") : "0,0"}%`,
    ]),
    ["TOTAL", String(rows.length), eur(totEur), brl(totBrl), brl(total), "100%"],
  ];
  const summaryStyle = {
    headStyles: { fillColor: purple, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      1: { halign: "right" as const },
      2: { halign: "right" as const },
      3: { halign: "right" as const },
      4: { halign: "right" as const },
      5: { halign: "right" as const },
    },
    margin: { left: margin, right: margin },
    didParseCell: (d: { section: string; row: { index: number }; table: { body: unknown[] }; cell: { styles: { fillColor: unknown; fontStyle: string } } }) => {
      if (d.section === "body" && d.row.index === d.table.body.length - 1) {
        d.cell.styles.fillColor = soft;
        d.cell.styles.fontStyle = "bold";
      }
    },
  };

  const section = (title: string, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...purple);
    doc.text(title, margin, y);
    doc.setFont("helvetica", "normal");
  };
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  section("Por forma de pagamento", 176);
  autoTable(doc, { ...summaryStyle, startY: 184, head: head("Forma"), body: body(group(rows, (r) => r.method)) });
  section("Por categoria", lastY() + 28);
  autoTable(doc, {
    ...summaryStyle,
    startY: lastY() + 36,
    head: head("Categoria"),
    body: body(group(rows, (r) => r.category)),
  });

  doc.addPage();
  section("Por dia", 50);
  const byDay = group(rows, (r) => r.date);
  autoTable(doc, {
    ...summaryStyle,
    startY: 58,
    head: head("Dia"),
    body: body(byDay.map((g) => ({ ...g, key: fmtDate(g.key) }))),
  });

  doc.addPage();
  section("Todas as despesas", 50);
  autoTable(doc, {
    startY: 58,
    head: [["Data", "Descrição", "Categoria", "Forma", "Valor", "Em R$"]],
    body: rows.map((r) => [
      fmtDate(r.date).slice(0, 5),
      pdfText(r.description),
      pdfText(r.category),
      pdfText(r.method),
      r.currency === "EUR" ? eur(r.amount) : r.currency === "BRL" ? brl(r.amount) : `${r.currency} ${nf.format(r.amount)}`,
      brl(r.brl),
    ]),
    headStyles: { fillColor: purple, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 246, 252] },
    columnStyles: { 0: { cellWidth: 34 }, 1: { cellWidth: 190 }, 4: { halign: "right" }, 5: { halign: "right" } },
    margin: { left: margin, right: margin, bottom: 40 },
  });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(`${pdfText(input.tripName)} · Relatório de despesas`, margin, doc.internal.pageSize.getHeight() - 24);
    doc.text(`Página ${p} de ${pages}`, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - 24, {
      align: "right",
    });
  }
  doc.save(`${fileBase(input)}.pdf`);
}

export async function exportExcel(input: ReportInput) {
  const XLSX = await import("xlsx");
  const rows = toRows(input);
  const n = rows.length;
  const last = n + 1;
  const rate = input.eurRate ?? 0;
  const wb = XLSX.utils.book_new();

  // Despesas (com fórmula de conversão ligada à cotação da aba Resumo)
  const despesas: (string | number | { f: string; v: number })[][] = [
    ["Data", "Descrição", "Categoria", "Forma de pagamento", "Moeda", "Valor (moeda original)", "Valor em R$"],
  ];
  rows.forEach((r, i) => {
    const line = i + 2;
    despesas.push([
      serial(r.date),
      r.description,
      r.category,
      r.method,
      r.currency,
      r.amount,
      r.currency === "EUR" ? { f: `F${line}*Resumo!$B$4`, v: r.brl } : r.brl,
    ]);
  });
  const wsD = XLSX.utils.aoa_to_sheet(despesas);
  wsD["!cols"] = [{ wch: 12 }, { wch: 60 }, { wch: 20 }, { wch: 22 }, { wch: 8 }, { wch: 18 }, { wch: 16 }];
  wsD["!autofilter"] = { ref: `A1:G${last}` };

  const R = (c: string) => `Despesas!$${c}$2:$${c}$${last}`;
  const total = rows.reduce((s, r) => s + r.brl, 0);
  const totEur = rows.filter((r) => r.currency === "EUR").reduce((s, r) => s + r.amount, 0);
  const totBrl = rows.filter((r) => r.currency === "BRL").reduce((s, r) => s + r.amount, 0);
  const days = new Set(rows.map((r) => r.date)).size;

  const resumo: (string | number | { f: string; v: number })[][] = [
    [`Relatório de despesas — ${input.tripName}`],
    [`Período: ${fmtDate(input.startDate)} a ${fmtDate(input.endDate)}`],
    [],
    ["Cotação do euro (R$) — editável", rate, "Altere aqui e os totais em R$ são recalculados."],
    [],
    ["Total gasto em euros (EUR)", { f: `SUMIFS(${R("F")},${R("E")},"EUR")`, v: totEur }],
    ["Total gasto em reais (BRL)", { f: `SUMIFS(${R("F")},${R("E")},"BRL")`, v: totBrl }],
    ["TOTAL GERAL em R$", { f: `SUM(${R("G")})`, v: total }],
    ["Nº de despesas", { f: `COUNTA(${R("B")})`, v: n }],
    ["Média por dia com gastos (R$)", { f: `B8/${Math.max(days, 1)}`, v: days ? total / days : 0 }],
  ];
  const wsR = XLSX.utils.aoa_to_sheet(resumo);
  wsR["!cols"] = [{ wch: 36 }, { wch: 18 }, { wch: 60 }];

  const summarySheet = (first: string, gs: Group[], col: "D" | "C" | "A", label: (k: string) => string | number = (k) => k) => {
    const aoa: (string | number | { f: string; v: number })[][] = [
      [first, "Qtd", "Total em EUR", "Total em R$ (lançado em reais)", "Total geral em R$", "% do total"],
    ];
    gs.forEach((g, i) => {
      const line = i + 2;
      const k = `$A${line}`;
      aoa.push([
        label(g.key),
        { f: `COUNTIFS(${R(col)},${k})`, v: g.count },
        { f: `SUMIFS(${R("F")},${R(col)},${k},${R("E")},"EUR")`, v: g.eur },
        { f: `SUMIFS(${R("F")},${R(col)},${k},${R("E")},"BRL")`, v: g.brlOrig },
        { f: `SUMIFS(${R("G")},${R(col)},${k})`, v: g.brl },
        { f: `IF(Resumo!$B$8=0,0,E${line}/Resumo!$B$8)`, v: total ? g.brl / total : 0 },
      ]);
    });
    const t = gs.length + 1;
    const sum = (c: string, v: number) => ({ f: `SUM(${c}2:${c}${t})`, v });
    aoa.push(["TOTAL", sum("B", n), sum("C", totEur), sum("D", totBrl), sum("E", total), sum("F", 1)]);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 28 }, { wch: 8 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 12 }];
    return ws;
  };

  const fmt = (ws: import("xlsx").WorkSheet, cols: Record<string, string>, from: number, to: number) => {
    for (let r = from; r <= to; r++)
      for (const [c, z] of Object.entries(cols)) {
        const cell = ws[`${c}${r}`];
        if (cell) cell.z = z;
      }
  };
  const REAL = '"R$" #,##0.00';
  const EURF = '"€" #,##0.00';
  fmt(wsD, { F: "#,##0.00", G: REAL }, 2, last);
  fmt(wsR, { B: REAL }, 4, 4);
  wsR["B4"].z = "0.0000";
  wsR["B6"].z = EURF;
  wsR["B7"].z = REAL;
  wsR["B8"].z = REAL;
  wsR["B10"].z = REAL;

  const byMethod = group(rows, (r) => r.method);
  const byCat = group(rows, (r) => r.category);
  const byDay = group(rows, (r) => r.date);
  const wsM = summarySheet("Forma de pagamento", byMethod, "D");
  const wsC = summarySheet("Categoria", byCat, "C");
  const wsDay = summarySheet("Dia", byDay, "A", serial);
  fmt(wsDay, { A: "dd/mm/yyyy" }, 2, byDay.length + 1);
  fmt(wsD, { A: "dd/mm/yyyy" }, 2, last);
  for (const [ws, len] of [
    [wsM, byMethod.length],
    [wsC, byCat.length],
    [wsDay, byDay.length],
  ] as const) {
    fmt(ws, { C: EURF, D: REAL, E: REAL, F: "0.0%" }, 2, len + 2);
  }

  XLSX.utils.book_append_sheet(wb, wsR, "Resumo");
  XLSX.utils.book_append_sheet(wb, wsD, "Despesas");
  XLSX.utils.book_append_sheet(wb, wsM, "Por forma de pagamento");
  XLSX.utils.book_append_sheet(wb, wsC, "Por categoria");
  XLSX.utils.book_append_sheet(wb, wsDay, "Por dia");
  XLSX.writeFile(wb, `${fileBase(input)}.xlsx`);
}
