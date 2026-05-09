import { supabase } from "@/integrations/supabase/client";

export async function fetchAll() {
  // RLS scopes everything to auth.uid()
  const [incomes, bills, debts, expenses, receivables] = await Promise.all([
    supabase.from("incomes").select("*").order("date_received"),
    supabase.from("bills").select("*").order("due_date"),
    supabase.from("debts").select("*").order("priority"),
    supabase.from("expenses").select("*").order("spent_at", { ascending: false }).limit(200),
    supabase.from("receivables").select("*").order("priority"),
  ]);
  return {
    incomes: incomes.data ?? [],
    bills: bills.data ?? [],
    debts: debts.data ?? [],
    expenses: expenses.data ?? [],
    receivables: receivables.data ?? [],
  };
}

export type FinanceData = Awaited<ReturnType<typeof fetchAll>>;

export function computeMetrics(data: FinanceData, currentBalance: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find next income date
  const upcomingIncomes = data.incomes
    .filter((i) => new Date(i.date_received) >= today)
    .sort((a, b) => new Date(a.date_received).getTime() - new Date(b.date_received).getTime());
  const nextIncome = upcomingIncomes[0];

  // Bills due before next income (or in next 30 days)
  const horizon = nextIncome ? new Date(nextIncome.date_received) : new Date(Date.now() + 30 * 86400000);
  const upcomingBills = data.bills.filter(
    (b) => Number(b.paid_amount ?? 0) < Number(b.amount) && new Date(b.due_date) <= horizon && new Date(b.due_date) >= new Date(today.getTime() - 86400000)
  );
  const billsTotal = upcomingBills.reduce((s, b) => s + Math.max(0, Number(b.amount) - Number(b.paid_amount ?? 0)), 0);

  const daysUntilIncome = nextIncome
    ? Math.max(1, Math.round((new Date(nextIncome.date_received).getTime() - today.getTime()) / 86400000))
    : 30;

  const availableForDaily = Math.max(0, currentBalance - billsTotal);
  const dailyBudget = availableForDaily / daysUntilIncome;

  const totalDebt = data.debts.reduce((s, d) => s + Number(d.remaining), 0);
  const totalReceivable = (data.receivables ?? []).reduce((s, r) => s + Number(r.remaining), 0);

  // last 30d spend
  const monthAgo = new Date(Date.now() - 30 * 86400000);
  const monthSpend = data.expenses
    .filter((e) => new Date(e.spent_at) >= monthAgo)
    .reduce((s, e) => s + Number(e.amount), 0);

  let status: "kritis" | "ketat" | "aman" = "aman";
  if (dailyBudget < 20000) status = "kritis";
  else if (dailyBudget < 40000) status = "ketat";

  return {
    dailyBudget,
    daysUntilIncome,
    nextIncome,
    upcomingBills,
    billsTotal,
    totalDebt,
    totalReceivable,
    monthSpend,
    status,
  };
}
