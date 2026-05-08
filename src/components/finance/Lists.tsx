import { supabase } from "@/integrations/supabase/client";
import { rupiah, dateID, daysUntil } from "@/lib/finance/format";
import { Button } from "@/components/ui/button";
import { Check, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { FinanceData } from "@/lib/finance/queries";

async function del(table: string, id: string, onAfter: () => void) {
  const { error } = await supabase.from(table as any).delete().eq("id", id);
  if (error) toast.error(error.message);
  else { toast.success("Dihapus"); onAfter(); }
}

export function BillsList({ bills, onChange }: { bills: FinanceData["bills"]; onChange: () => void }) {
  if (!bills.length) return <Empty msg="Belum ada tagihan"/>;
  return (
    <ul className="space-y-2">
      {bills.map(b=>{
        const d = daysUntil(b.due_date);
        const tone = b.paid ? "opacity-50" : d < 0 ? "border-destructive/50" : d <= 3 ? "border-warning/50" : "border-border";
        return (
          <li key={b.id} className={`bg-card rounded-xl border ${tone} p-3 flex items-center gap-3`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{b.name}</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{b.category}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {dateID(b.due_date)} · {b.paid ? "Lunas" : d < 0 ? `Telat ${-d}h` : d===0 ? "Hari ini" : `${d}h lagi`}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold num">{rupiah(b.amount)}</div>
            </div>
            {!b.paid && (
              <Button size="icon" variant="ghost" onClick={async()=>{
                await supabase.from("bills").update({paid:true}).eq("id",b.id);
                onChange();
              }}><Check className="size-4"/></Button>
            )}
            <Button size="icon" variant="ghost" onClick={()=>del("bills",b.id,onChange)}><Trash2 className="size-4 text-destructive"/></Button>
          </li>
        );
      })}
    </ul>
  );
}

export function DebtsList({ debts, onChange }: { debts: FinanceData["debts"]; onChange: () => void }) {
  if (!debts.length) return <Empty msg="Tidak ada hutang 🎉"/>;
  return (
    <ul className="space-y-2">
      {debts.map(d=>{
        const pct = Math.round((1 - Number(d.remaining)/Number(d.total_amount)) * 100);
        return (
          <li key={d.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold flex-1 truncate">{d.creditor}</span>
              <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${d.priority<=2?"bg-warning/20 text-warning":"bg-muted text-muted-foreground"}`}>P{d.priority}</span>
              <Button size="icon" variant="ghost" onClick={()=>del("debts",d.id,onChange)}><Trash2 className="size-4 text-destructive"/></Button>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Sisa <span className="text-foreground font-semibold num">{rupiah(d.remaining)}</span> / {rupiah(d.total_amount)}</div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-money" style={{width: pct+"%"}}/>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ExpensesList({ expenses, onChange }: { expenses: FinanceData["expenses"]; onChange: () => void }) {
  if (!expenses.length) return <Empty msg="Belum ada pengeluaran tercatat"/>;
  return (
    <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
      {expenses.slice(0,30).map(e=>(
        <li key={e.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium capitalize">{e.category}</div>
            <div className="text-xs text-muted-foreground truncate">{e.note || dateID(e.spent_at)}</div>
          </div>
          <div className="font-semibold num text-destructive/90">-{rupiah(e.amount)}</div>
          <Button size="icon" variant="ghost" onClick={()=>del("expenses",e.id,onChange)}><Trash2 className="size-4 text-destructive"/></Button>
        </li>
      ))}
    </ul>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
      <AlertCircle className="size-5 opacity-50"/>
      {msg}
    </div>
  );
}
