import { supabase } from "@/integrations/supabase/client";
import { rupiah, dateID, daysUntil } from "@/lib/finance/format";
import { Button } from "@/components/ui/button";
import { Check, Trash2, AlertCircle, Pencil, Coins } from "lucide-react";
import { toast } from "sonner";
import type { FinanceData } from "@/lib/finance/queries";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setBalance, getBalance } from "@/lib/finance/balance";

async function del(table: string, id: string, onAfter: () => void) {
  const { error } = await supabase.from(table as any).delete().eq("id", id);
  if (error) toast.error(error.message);
  else { toast.success("Dihapus"); onAfter(); }
}

type EditState =
  | { kind: "bill"; row: any }
  | { kind: "debt"; row: any }
  | { kind: "receivable"; row: any }
  | { kind: "expense"; row: any }
  | null;

function EditDialog({ state, onClose, onSaved }: { state: EditState; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(state?.row ?? {});
  if (!state) return null;

  async function save() {
    const { kind, row } = state!;
    const tableMap = { bill: "bills", debt: "debts", receivable: "receivables", expense: "expenses" } as const;
    const table = tableMap[kind];
    const payload: any = { ...form };
    delete payload.id; delete payload.created_at; delete payload.user_id; delete payload.device_id;
    if (kind === "bill") payload.amount = Number(payload.amount);
    if (kind === "debt") { payload.total_amount = Number(payload.total_amount); payload.remaining = Number(payload.remaining); }
    if (kind === "receivable") { payload.total_amount = Number(payload.total_amount); payload.remaining = Number(payload.remaining); }
    if (kind === "expense") payload.amount = Number(payload.amount);
    const { error } = await supabase.from(table).update(payload).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Tersimpan");
    onSaved(); onClose();
  }

  return (
    <Dialog open={!!state} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {state.kind === "bill" ? "Tagihan" : state.kind === "debt" ? "Hutang" : state.kind === "receivable" ? "Piutang" : "Pengeluaran"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {state.kind === "bill" && (
            <>
              <Field label="Nama" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jumlah" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
                <Field label="Jatuh tempo" type="date" value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} />
              </div>
              <Field label="Kategori" value={form.category ?? ""} onChange={(v) => setForm({ ...form, category: v })} />
            </>
          )}
          {state.kind === "debt" && (
            <>
              <Field label="Kepada" value={form.creditor} onChange={(v) => setForm({ ...form, creditor: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Total" type="number" value={form.total_amount} onChange={(v) => setForm({ ...form, total_amount: v })} />
                <Field label="Sisa" type="number" value={form.remaining} onChange={(v) => setForm({ ...form, remaining: v })} />
              </div>
              <Field label="Catatan" value={form.notes ?? ""} onChange={(v) => setForm({ ...form, notes: v })} />
            </>
          )}
          {state.kind === "receivable" && (
            <>
              <Field label="Dari" value={form.debtor} onChange={(v) => setForm({ ...form, debtor: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Total" type="number" value={form.total_amount} onChange={(v) => setForm({ ...form, total_amount: v })} />
                <Field label="Sisa" type="number" value={form.remaining} onChange={(v) => setForm({ ...form, remaining: v })} />
              </div>
              <Field label="Tanggal" type="date" value={form.due_date ?? ""} onChange={(v) => setForm({ ...form, due_date: v || null })} />
              <Field label="Catatan" value={form.notes ?? ""} onChange={(v) => setForm({ ...form, notes: v })} />
            </>
          )}
          {state.kind === "expense" && (
            <>
              <Field label="Kategori" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
              <Field label="Jumlah" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
              <Field label="Catatan" value={form.note ?? ""} onChange={(v) => setForm({ ...form, note: v })} />
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={save} className="bg-gradient-money text-primary-foreground">Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PartialPayDialog({ bill, onClose, onSaved }: { bill: any; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  if (!bill) return null;
  const remaining = Math.max(0, Number(bill.amount) - Number(bill.paid_amount ?? 0));
  async function pay() {
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("Jumlah tidak valid");
    const newPaid = Math.min(Number(bill.amount), Number(bill.paid_amount ?? 0) + n);
    const fully = newPaid >= Number(bill.amount);
    const { error } = await supabase.from("bills").update({ paid_amount: newPaid, paid: fully }).eq("id", bill.id);
    if (error) return toast.error(error.message);
    // also deduct from local balance
    const bal = getBalance();
    setBalance(Math.max(0, bal - n));
    toast.success(`Dibayar ${rupiah(n)}`);
    onSaved(); onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cicil tagihan {bill.name}</DialogTitle></DialogHeader>
        <div className="text-sm text-muted-foreground">Sisa <span className="text-foreground font-bold">{rupiah(remaining)}</span> dari {rupiah(bill.amount)}</div>
        <div className="mt-3">
          <Label>Jumlah yang dibayar (Rp)</Label>
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder={String(remaining)} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={() => setAmount(String(remaining))} variant="outline">Lunasi</Button>
          <Button onClick={pay} className="bg-gradient-money text-primary-foreground">Bayar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BillsList({ bills, onChange }: { bills: FinanceData["bills"]; onChange: () => void }) {
  const [edit, setEdit] = useState<EditState>(null);
  const [partial, setPartial] = useState<any>(null);
  if (!bills.length) return <Empty msg="Belum ada tagihan"/>;
  return (
    <>
    <ul className="space-y-2">
      {bills.map(b=>{
        const d = daysUntil(b.due_date);
        const paidAmt = Number(b.paid_amount ?? 0);
        const total = Number(b.amount);
        const fullyPaid = paidAmt >= total;
        const pct = total > 0 ? Math.min(100, Math.round((paidAmt / total) * 100)) : 0;
        const tone = fullyPaid ? "opacity-60" : d < 0 ? "border-destructive/50" : d <= 3 ? "border-warning/50" : "border-border";
        return (
          <li key={b.id} className={`bg-card rounded-xl border ${tone} p-3`}>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{b.name}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{b.category}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {dateID(b.due_date)} · {fullyPaid ? "Lunas" : d < 0 ? `Telat ${-d}h` : d===0 ? "Hari ini" : `${d}h lagi`}
                  {paidAmt > 0 && !fullyPaid && ` · Sudah ${rupiah(paidAmt)}`}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold num">{rupiah(total)}</div>
                {paidAmt > 0 && !fullyPaid && <div className="text-[10px] text-muted-foreground">sisa {rupiah(total - paidAmt)}</div>}
              </div>
              {!fullyPaid && (
                <Button size="icon" variant="ghost" title="Cicil/Bayar" onClick={() => setPartial(b)}><Coins className="size-4 text-money"/></Button>
              )}
              <Button size="icon" variant="ghost" title="Edit" onClick={() => setEdit({ kind: "bill", row: b })}><Pencil className="size-4"/></Button>
              <Button size="icon" variant="ghost" title="Hapus" onClick={()=>del("bills",b.id,onChange)}><Trash2 className="size-4 text-destructive"/></Button>
            </div>
            {paidAmt > 0 && (
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-money" style={{ width: pct + "%" }}/>
              </div>
            )}
          </li>
        );
      })}
    </ul>
    <EditDialog state={edit} onClose={() => setEdit(null)} onSaved={onChange} />
    {partial && <PartialPayDialog bill={partial} onClose={() => setPartial(null)} onSaved={onChange} />}
    </>
  );
}

export function DebtsList({ debts, onChange }: { debts: FinanceData["debts"]; onChange: () => void }) {
  const [edit, setEdit] = useState<EditState>(null);
  if (!debts.length) return <Empty msg="Tidak ada hutang 🎉"/>;
  return (
    <>
    <ul className="space-y-2">
      {debts.map(d=>{
        const pct = Math.round((1 - Number(d.remaining)/Number(d.total_amount)) * 100);
        const prio = Number(d.priority ?? 3);
        return (
          <li key={d.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold flex-1 truncate">{d.creditor}</span>
              <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${prio <= 2 ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"}`}>P{prio}</span>
              <Button size="icon" variant="ghost" title="Edit" onClick={() => setEdit({ kind: "debt", row: d })}><Pencil className="size-4"/></Button>
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
    <EditDialog state={edit} onClose={() => setEdit(null)} onSaved={onChange} />
    </>
  );
}

export function ReceivablesList({ items, onChange }: { items: any[]; onChange: () => void }) {
  const [edit, setEdit] = useState<EditState>(null);
  if (!items.length) return <Empty msg="Belum ada piutang"/>;
  return (
    <>
    <ul className="space-y-2">
      {items.map(r => {
        const pct = Math.round((1 - Number(r.remaining)/Number(r.total_amount)) * 100);
        const prio = Number(r.priority ?? 3);
        const due = r.due_date ? daysUntil(r.due_date) : null;
        return (
          <li key={r.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold flex-1 truncate">{r.debtor}</span>
              <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${prio <= 2 ? "bg-money/20 text-money" : "bg-muted text-muted-foreground"}`}>P{prio}</span>
              <Button size="icon" variant="ghost" title="Edit" onClick={() => setEdit({ kind: "receivable", row: r })}><Pencil className="size-4"/></Button>
              <Button size="icon" variant="ghost" onClick={() => del("receivables", r.id, onChange)}><Trash2 className="size-4 text-destructive"/></Button>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Belum dibayar <span className="text-money font-semibold num">{rupiah(r.remaining)}</span> / {rupiah(r.total_amount)}
              {r.due_date && <> · {dateID(r.due_date)}{due !== null && due < 0 ? ` (telat ${-due}h)` : ""}</>}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-money" style={{ width: pct + "%" }}/>
            </div>
          </li>
        );
      })}
    </ul>
    <EditDialog state={edit} onClose={() => setEdit(null)} onSaved={onChange} />
    </>
  );
}

export function ExpensesList({ expenses, onChange }: { expenses: FinanceData["expenses"]; onChange: () => void }) {
  const [edit, setEdit] = useState<EditState>(null);
  if (!expenses.length) return <Empty msg="Belum ada pengeluaran tercatat"/>;
  return (
    <>
    <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
      {expenses.slice(0,30).map(e=>(
        <li key={e.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium capitalize">{e.category}</div>
            <div className="text-xs text-muted-foreground truncate">{e.note || dateID(e.spent_at)}</div>
          </div>
          <div className="font-semibold num text-destructive/90">-{rupiah(e.amount)}</div>
          <Button size="icon" variant="ghost" title="Edit" onClick={() => setEdit({ kind: "expense", row: e })}><Pencil className="size-4"/></Button>
          <Button size="icon" variant="ghost" onClick={()=>del("expenses",e.id,onChange)}><Trash2 className="size-4 text-destructive"/></Button>
        </li>
      ))}
    </ul>
    <EditDialog state={edit} onClose={() => setEdit(null)} onSaved={onChange} />
    </>
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
