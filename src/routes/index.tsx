import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { fetchAll, computeMetrics, type FinanceData } from "@/lib/finance/queries";
import { getBalance, setBalance } from "@/lib/finance/balance";
import { rupiah, dateID } from "@/lib/finance/format";
import { StatCard } from "@/components/finance/StatCard";
import { QuickAdd } from "@/components/finance/QuickAdd";
import { BillsList, DebtsList, ExpensesList } from "@/components/finance/Lists";
import { Chat } from "@/components/finance/Chat";
import { BalanceEditor } from "@/components/finance/BalanceEditor";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, Coins, TrendingDown, AlertTriangle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [data, setData] = useState<FinanceData>({ incomes: [], bills: [], debts: [], expenses: [] });
  const [balance, setBal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await fetchAll();
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    setBal(getBalance());
    const h = () => setBal(getBalance());
    window.addEventListener("balance-changed", h);
    return () => window.removeEventListener("balance-changed", h);
  }, [load]);

  // auto-deduct expense from balance
  const onExpenseAdded = useCallback(async () => {
    await load();
  }, [load]);

  const m = computeMetrics(data, balance);

  const statusColor = m.status === "kritis" ? "text-destructive" : m.status === "ketat" ? "text-warning" : "text-money";
  const statusLabel = m.status === "kritis" ? "Kritis" : m.status === "ketat" ? "Ketat" : "Aman";

  return (
    <main className="min-h-screen pb-12">
      <Toaster richColors theme="dark" position="top-center"/>

      {/* Header */}
      <header className="px-4 md:px-8 pt-8 pb-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="size-9 rounded-xl bg-gradient-money grid place-items-center shadow-glow">
                <Sparkles className="size-5 text-primary-foreground"/>
              </span>
              Dompet Pintar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Asisten keuangan pribadi yang realistis</p>
          </div>
          <div className={`text-right`}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</div>
            <div className={`font-bold ${statusColor}`}>{statusLabel}</div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-3 gap-5">
        {/* LEFT: dashboard */}
        <div className="lg:col-span-2 space-y-5">
          <BalanceEditor onChange={load}/>

          <div className="grid sm:grid-cols-3 gap-3">
            <StatCard
              tone={m.status==="kritis"?"danger":m.status==="ketat"?"warn":"money"}
              icon={<Coins className="size-4"/>}
              label="Budget harian"
              value={rupiah(m.dailyBudget)}
              hint={`/hari · ${m.daysUntilIncome} hari sampai pemasukan`}
            />
            <StatCard
              icon={<Calendar className="size-4"/>}
              label="Pemasukan berikut"
              value={m.nextIncome ? rupiah(m.nextIncome.amount) : "—"}
              hint={m.nextIncome ? `${m.nextIncome.name} · ${dateID(m.nextIncome.date_received)}` : "Belum ada terjadwal"}
            />
            <StatCard
              tone="warn"
              icon={<AlertTriangle className="size-4"/>}
              label="Tagihan menunggu"
              value={rupiah(m.billsTotal)}
              hint={`${m.upcomingBills.length} tagihan`}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <StatCard
              tone={m.totalDebt>0?"warn":"default"}
              icon={<TrendingDown className="size-4"/>}
              label="Total hutang"
              value={rupiah(m.totalDebt)}
              hint={data.debts.length ? `${data.debts.length} pemberi pinjaman` : "Bebas hutang"}
            />
            <StatCard
              icon={<TrendingDown className="size-4"/>}
              label="Pengeluaran 30 hari"
              value={rupiah(m.monthSpend)}
              hint={`${data.expenses.length} transaksi tercatat`}
            />
          </div>

          <QuickAdd onAdded={load}/>

          <div className="bg-gradient-card rounded-2xl border border-border p-5 shadow-card">
            <Tabs defaultValue="bills">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="bills">Tagihan</TabsTrigger>
                <TabsTrigger value="debts">Hutang</TabsTrigger>
                <TabsTrigger value="expenses">Pengeluaran</TabsTrigger>
              </TabsList>
              <TabsContent value="bills" className="pt-4">
                {loading ? <Skeleton/> : <BillsList bills={data.bills} onChange={load}/>}
              </TabsContent>
              <TabsContent value="debts" className="pt-4">
                {loading ? <Skeleton/> : <DebtsList debts={data.debts} onChange={load}/>}
              </TabsContent>
              <TabsContent value="expenses" className="pt-4">
                {loading ? <Skeleton/> : <ExpensesList expenses={data.expenses} onChange={load}/>}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* RIGHT: chat */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Chat data={data} balance={balance}/>
        </div>
      </div>
    </main>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[0,1,2].map(i=>(
        <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse"/>
      ))}
    </div>
  );
}
