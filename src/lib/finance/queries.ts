import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "./device";

export async function fetchAll() {
  const device_id = getDeviceId();
  const [incomes, bills, debts, expenses] = await Promise.all([
    supabase.from("incomes").select("*").eq("device_id", device_id).order("date_received"),
    supabase.from("bills").select("*").eq("device_id", device_id).order("due_date"),
    supabase.from("debts").select("*").eq("device_id", device_id).order("priority"),
    supabase.from("expenses").select("*").eq("device_id", device_id).order("spent_at", { ascending: false }).limit(200),
  ]);
  return {
    incomes: incomes.data ?? [],
    bills: bills.data ?? [],
    debts: debts.data ?? [],
    expenses: expenses.data ?? [],
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
    (b) => !b.paid && new Date(b.due_date) <= horizon && new Date(b.due_date) >= new Date(today.getTime() - 86400000)
  );
  const billsTotal = upcomingBills.reduce((s, b) => s + Number(b.amount), 0);

  const daysUntilIncome = nextIncome
    ? Math.max(1, Math.round((new Date(nextIncome.date_received).getTime() - today.getTime()) / 86400000))
    : 30;

  const availableForDaily = Math.max(0, currentBalance - billsTotal);
  const dailyBudget = availableForDaily / daysUntilIncome;

  const totalDebt = data.debts.reduce((s, d) => s + Number(d.remaining), 0);

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
    monthSpend,
    status,
  };
}
