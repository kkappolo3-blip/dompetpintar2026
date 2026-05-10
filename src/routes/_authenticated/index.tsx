import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchAll, computeMetrics, type FinanceData } from "@/lib/finance/queries";
import { getBalance } from "@/lib/finance/balance";
import { rupiah, dateID, daysUntil } from "@/lib/finance/format";
import { StatCard } from "@/components/finance/StatCard";
import { QuickAdd } from "@/components/finance/QuickAdd";
import { BillsList, DebtsList, ExpensesList, ReceivablesList } from "@/components/finance/Lists";
import { PaymentPlans } from "@/components/finance/PaymentPlans";
import { Chat } from "@/components/finance/Chat";
import { BalanceEditor } from "@/components/finance/BalanceEditor";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, Coins, TrendingDown, AlertTriangle, Sparkles, LogOut, Wallet, HandCoins, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth, signOut } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<FinanceData>({ incomes: [], bills: [], debts: [], expenses: [], receivables: [] });
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

  const m = computeMetrics(data, balance);

  const statusColor = m.status === "kritis" ? "text-destructive" : m.status === "ketat" ? "text-warning" : "text-money";
  const statusLabel = m.status === "kritis" ? "Kritis" : m.status === "ketat" ? "Ketat" : "Aman";

  // ---- detailed breakdowns
  const overdue = m.upcomingBills.filter((b) => daysUntil(b.due_date) < 0);
  const dueToday = m.upcomingBills.filter((b) => daysUntil(b.due_date) === 0);
  const dueWeek = m.upcomingBills.filter((b) => { const d = daysUntil(b.due_date); return d > 0 && d <= 7; });
  const nearestBill = [...m.upcomingBills].sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date))[0];

  const monthIncomes = useMemo(() => {
    const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
    const end = new Date(start); end.setMonth(end.getMonth()+1);
    return data.incomes.filter(i => {
      const d = new Date(i.date_received);
      return d >= start && d < end;
    });
  }, [data.incomes]);
  const monthIncomeTotal = monthIncomes.reduce((s, i) => s + Number(i.amount), 0);

  // top expense category last 30d
  const monthAgo = Date.now() - 30 * 86400000;
  const recentExpenses = data.expenses.filter(e => new Date(e.spent_at).getTime() >= monthAgo);
  const byCat: Record<string, number> = {};
  recentExpenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const dailyAvg = recentExpenses.length ? (recentExpenses.reduce((s, e) => s + Number(e.amount), 0) / 30) : 0;

  const topDebt = [...data.debts].sort((a, b) => Number(a.priority ?? 3) - Number(b.priority ?? 3))[0];
  const oldestReceivable = [...(data.receivables ?? [])].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

  async function logout() {
    await signOut();
    navigate({ to: "/auth" });
  }

  return (
    <main className="min-h-screen pb-12">
      <Toaster richColors theme="dark" position="top-center"/>

      <header className="px-4 md:px-8 pt-8 pb-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="size-9 rounded-xl bg-gradient-money grid place-items-center shadow-glow">
                <Sparkles className="size-5 text-primary-foreground"/>
              </span>
              Dompet Pintar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {user?.email ? <>Halo, <span className="text-foreground">{user.email}</span></> : "Asisten keuangan pribadi"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</div>
              <div className={`font-bold ${statusColor}`}>{statusLabel}</div>
            </div>
            <Button variant="outline" size="sm" onClick={logout}><LogOut className="size-4 mr-1"/>Keluar</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <BalanceEditor onChange={load}/>

          <div className="grid sm:grid-cols-3 gap-3">
            <DetailedCard
              tone={m.status==="kritis"?"danger":m.status==="ketat"?"warn":"money"}
              icon={<Coins className="size-4"/>}
              label="Budget harian"
              value={rupiah(m.dailyBudget)}
              hint={`/hari · ${m.daysUntilIncome} hari sampai pemasukan`}
              detail={
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>Saldo: <b className="text-foreground num">{rupiah(balance)}</b></li>
                  <li>− Tagihan menunggu: <b className="text-foreground num">{rupiah(m.billsTotal)}</b></li>
                  <li>= Tersedia: <b className="text-foreground num">{rupiah(Math.max(0, balance - m.billsTotal))}</b></li>
                  <li>÷ {m.daysUntilIncome} hari = <b className={`num ${statusColor}`}>{rupiah(m.dailyBudget)}/hari</b></li>
                  {m.status === "kritis" && <li className="text-destructive">⚠ Hemat ekstra, budget di bawah Rp20rb</li>}
                </ul>
              }
            />
            <DetailedCard
              icon={<Calendar className="size-4"/>}
              label="Pemasukan berikut"
              value={m.nextIncome ? rupiah(m.nextIncome.amount) : "—"}
              hint={m.nextIncome ? `${m.nextIncome.name} · ${dateID(m.nextIncome.date_received)}` : "Belum ada terjadwal"}
              detail={
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {m.nextIncome ? (
                    <>
                      <li>Sumber: <b className="text-foreground">{m.nextIncome.name}</b></li>
                      <li>Tanggal: <b className="text-foreground">{dateID(m.nextIncome.date_received)}</b></li>
                      <li><b className={statusColor}>{m.daysUntilIncome} hari</b> lagi</li>
                    </>
                  ) : <li>Belum ada pemasukan terjadwal — tambahkan supaya budget akurat.</li>}
                  <li className="pt-1 border-t border-border">Total bulan ini: <b className="text-foreground num">{rupiah(monthIncomeTotal)}</b> ({monthIncomes.length} sumber)</li>
                </ul>
              }
            />
            <DetailedCard
              tone="warn"
              icon={<AlertTriangle className="size-4"/>}
              label="Tagihan menunggu"
              value={rupiah(m.billsTotal)}
              hint={`${m.upcomingBills.length} tagihan`}
              detail={
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {overdue.length > 0 && <li className="text-destructive">⚠ Telat: <b>{overdue.length}</b> tagihan ({rupiah(overdue.reduce((s,b)=>s+Number(b.amount)-Number(b.paid_amount??0),0))})</li>}
                  {dueToday.length > 0 && <li className="text-warning">Hari ini: <b>{dueToday.length}</b></li>}
                  <li>Minggu ini: <b className="text-foreground">{dueWeek.length}</b></li>
                  {nearestBill && <li className="pt-1 border-t border-border">Terdekat: <b className="text-foreground">{nearestBill.name}</b> ({dateID(nearestBill.due_date)})</li>}
                </ul>
              }
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <DetailedCard
              tone={m.totalDebt > 0 ? "warn" : "default"}
              icon={<TrendingDown className="size-4"/>}
              label="Total hutang"
              value={rupiah(m.totalDebt)}
              hint={data.debts.length ? `${data.debts.length} pemberi pinjaman` : "Bebas hutang"}
              detail={
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {topDebt ? (
                    <>
                      <li>Prioritas tertinggi: <b className="text-foreground">{topDebt.creditor}</b> (P{topDebt.priority ?? 3})</li>
                      <li>Sisa: <b className="text-foreground num">{rupiah(topDebt.remaining)}</b></li>
                    </>
                  ) : <li>Tidak ada hutang aktif. 🎉</li>}
                  <li className="pt-1 border-t border-border">Estimasi cicilan/bulan: <b className="text-foreground num">{rupiah(m.totalDebt / 12)}</b> (12 bulan)</li>
                </ul>
              }
            />
            <DetailedCard
              tone="money"
              icon={<HandCoins className="size-4"/>}
              label="Total piutang"
              value={rupiah(m.totalReceivable)}
              hint={(data.receivables ?? []).length ? `${data.receivables.length} orang berhutang` : "Tidak ada"}
              detail={
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {oldestReceivable ? (
                    <>
                      <li>Paling lama: <b className="text-foreground">{oldestReceivable.debtor}</b></li>
                      <li>Sejak: <b className="text-foreground">{dateID(oldestReceivable.created_at)}</b> ({rupiah(oldestReceivable.remaining)})</li>
                    </>
                  ) : <li>Belum ada piutang dicatat.</li>}
                  <li className="pt-1 border-t border-border">Bila tertagih: saldo bisa naik <b className="text-money num">{rupiah(m.totalReceivable)}</b></li>
                </ul>
              }
            />
            <DetailedCard
              icon={<Wallet className="size-4"/>}
              label="Pengeluaran 30 hari"
              value={rupiah(m.monthSpend)}
              hint={`${data.expenses.length} transaksi`}
              detail={
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {topCat ? <li>Terbesar: <b className="text-foreground capitalize">{topCat[0]}</b> · {rupiah(topCat[1])}</li> : <li>Belum ada data.</li>}
                  <li>Rata-rata: <b className="text-foreground num">{rupiah(dailyAvg)}/hari</b></li>
                  <li>Transaksi: <b className="text-foreground">{recentExpenses.length}</b> dalam 30 hari</li>
                </ul>
              }
            />
          </div>

          <QuickAdd onAdded={load}/>

          <div className="bg-gradient-card rounded-2xl border border-border p-5 shadow-card">
            <Tabs defaultValue="bills">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="bills">Tagihan</TabsTrigger>
                <TabsTrigger value="debts">Hutang</TabsTrigger>
                <TabsTrigger value="receivables">Piutang</TabsTrigger>
                <TabsTrigger value="plans">Plan</TabsTrigger>
                <TabsTrigger value="expenses">Keluar</TabsTrigger>
              </TabsList>
              <TabsContent value="bills" className="pt-4">
                {loading ? <Skeleton/> : <BillsList bills={data.bills} onChange={load}/>}
              </TabsContent>
              <TabsContent value="debts" className="pt-4">
                {loading ? <Skeleton/> : <DebtsList debts={data.debts} onChange={load}/>}
              </TabsContent>
              <TabsContent value="receivables" className="pt-4">
                {loading ? <Skeleton/> : <ReceivablesList items={data.receivables ?? []} onChange={load}/>}
              </TabsContent>
              <TabsContent value="plans" className="pt-4">
                <PaymentPlans/>
              </TabsContent>
              <TabsContent value="expenses" className="pt-4">
                {loading ? <Skeleton/> : <ExpensesList expenses={data.expenses} onChange={load}/>}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <Chat data={data} balance={balance}/>
        </div>
      </div>
    </main>
  );
}

function DetailedCard({ label, value, hint, tone, icon, detail }: {
  label: string; value: React.ReactNode; hint?: React.ReactNode;
  tone?: "default" | "money" | "warn" | "danger";
  icon?: React.ReactNode; detail: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="block w-full text-left">
        <StatCard label={label} value={value} hint={
          <span className="flex items-center gap-1">{hint} <ChevronDown className={`size-3 transition ${open?"rotate-180":""}`}/></span>
        } tone={tone} icon={icon}/>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 px-4 py-3 bg-card/60 rounded-xl border border-border">
        {detail}
      </CollapsibleContent>
    </Collapsible>
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