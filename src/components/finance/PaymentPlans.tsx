import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { rupiah, dateID } from "@/lib/finance/format";
import { useAuth } from "@/lib/auth";

type Plan = {
  id: string; title: string; notes: string | null; status: string;
  total_budget: number | null; planned_for: string | null; created_at: string;
};
type Item = {
  id: string; plan_id: string; name: string; qty: number; unit: string | null;
  est_price: number; actual_price: number | null; status: string; note: string | null; position: number;
};

export function PaymentPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);

  async function load() {
    const { data } = await supabase.from("payment_plans").select("*").order("created_at", { ascending: false });
    setPlans((data ?? []) as Plan[]);
  }
  async function loadItems(planId: string) {
    const { data } = await supabase.from("payment_plan_items").select("*").eq("plan_id", planId).order("position").order("created_at");
    setItems((s) => ({ ...s, [planId]: (data ?? []) as Item[] }));
  }
  useEffect(() => { load(); }, []);

  async function delPlan(id: string) {
    if (!confirm("Hapus plan ini?")) return;
    const { error } = await supabase.from("payment_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plan dihapus"); load();
  }

  async function addItem(planId: string, name: string) {
    if (!name.trim() || !user) return;
    const { error } = await supabase.from("payment_plan_items").insert({
      plan_id: planId, user_id: user.id, name: name.trim(),
    });
    if (error) return toast.error(error.message);
    loadItems(planId);
  }

  async function toggleItem(item: Item, status: string) {
    const { error } = await supabase.from("payment_plan_items").update({ status }).eq("id", item.id);
    if (error) return toast.error(error.message);
    loadItems(item.plan_id);
  }

  async function delItem(item: Item) {
    const { error } = await supabase.from("payment_plan_items").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    loadItems(item.plan_id);
  }

  function toggleOpen(id: string) {
    setOpen((s) => ({ ...s, [id]: !s[id] }));
    if (!items[id]) loadItems(id);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">Rencanakan belanja atau pembayaran sebelum dikeluarkan.</div>
        <Button size="sm" onClick={() => setCreating(true)} className="bg-gradient-money text-primary-foreground">
          <Plus className="size-4 mr-1"/>Plan baru
        </Button>
      </div>

      {plans.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <ShoppingBasket className="size-6 mx-auto mb-2 opacity-50"/>
          Belum ada plan. Coba "Belanja pasar" atau "Bayar bulanan".
        </div>
      )}

      <ul className="space-y-2">
        {plans.map((p) => {
          const list = items[p.id] ?? [];
          const totalEst = list.reduce((s, i) => s + Number(i.est_price) * Number(i.qty), 0);
          const bought = list.filter((i) => i.status === "bought");
          const totalActual = bought.reduce((s, i) => s + Number(i.actual_price ?? i.est_price) * Number(i.qty), 0);
          return (
            <li key={p.id} className="bg-card rounded-xl border border-border">
              <div className="p-3 flex items-center gap-2">
                <button onClick={() => toggleOpen(p.id)} className="flex-1 flex items-center gap-2 text-left min-w-0">
                  {open[p.id] ? <ChevronDown className="size-4"/> : <ChevronRight className="size-4"/>}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.planned_for ? dateID(p.planned_for) + " · " : ""}
                      {list.length} item · est {rupiah(totalEst)}
                      {bought.length > 0 && ` · terbeli ${rupiah(totalActual)}`}
                    </div>
                  </div>
                </button>
                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${p.status === "done" ? "bg-money/20 text-money" : p.status === "cancelled" ? "bg-muted text-muted-foreground" : "bg-warning/20 text-warning"}`}>{p.status}</span>
                <Button size="icon" variant="ghost" onClick={() => setEditPlan(p)}><Pencil className="size-4"/></Button>
                <Button size="icon" variant="ghost" onClick={() => delPlan(p.id)}><Trash2 className="size-4 text-destructive"/></Button>
              </div>
              {open[p.id] && (
                <div className="border-t border-border p-3 space-y-2">
                  {p.notes && <div className="text-xs text-muted-foreground italic">{p.notes}</div>}
                  <ItemList items={list} onToggle={toggleItem} onDelete={delItem} onEdit={setEditItem}/>
                  <AddItemRow onAdd={(n) => addItem(p.id, n)}/>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {creating && <PlanDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }}/>}
      {editPlan && <PlanDialog plan={editPlan} onClose={() => setEditPlan(null)} onSaved={() => { setEditPlan(null); load(); }}/>}
      {editItem && <ItemDialog item={editItem} onClose={() => setEditItem(null)} onSaved={() => { const id = editItem.plan_id; setEditItem(null); loadItems(id); }}/>}
    </div>
  );
}

function ItemList({ items, onToggle, onDelete, onEdit }: {
  items: Item[]; onToggle: (i: Item, s: string) => void; onDelete: (i: Item) => void; onEdit: (i: Item) => void;
}) {
  if (!items.length) return <div className="text-xs text-muted-foreground py-2">Belum ada item.</div>;
  return (
    <ul className="space-y-1">
      {items.map((i) => {
        const done = i.status === "bought";
        const skipped = i.status === "skipped";
        return (
          <li key={i.id} className={`flex items-center gap-2 p-2 rounded-lg bg-background/40 ${done ? "opacity-60" : ""} ${skipped ? "opacity-50 line-through" : ""}`}>
            <button onClick={() => onToggle(i, done ? "pending" : "bought")} className={`size-5 rounded border ${done ? "bg-money border-money" : "border-border"} grid place-items-center shrink-0`}>
              {done && <Check className="size-3 text-primary-foreground"/>}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium truncate ${done ? "line-through" : ""}`}>{i.name} {Number(i.qty) > 1 && <span className="text-xs text-muted-foreground">×{i.qty}{i.unit ? ` ${i.unit}` : ""}</span>}</div>
              {i.note && <div className="text-[11px] text-muted-foreground truncate">{i.note}</div>}
            </div>
            <div className="text-xs num text-right">
              {Number(i.est_price) > 0 && <div>{rupiah(Number(i.est_price) * Number(i.qty))}</div>}
              {done && i.actual_price != null && <div className="text-money">{rupiah(Number(i.actual_price) * Number(i.qty))}</div>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => onToggle(i, skipped ? "pending" : "skipped")} title="Tidak jadi"><X className={`size-4 ${skipped ? "text-warning" : ""}`}/></Button>
            <Button size="icon" variant="ghost" onClick={() => onEdit(i)}><Pencil className="size-4"/></Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(i)}><Trash2 className="size-4 text-destructive"/></Button>
          </li>
        );
      })}
    </ul>
  );
}

function AddItemRow({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onAdd(name); setName(""); } }} className="flex gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tambah item, contoh: bawang merah"/>
      <Button type="submit" size="sm"><Plus className="size-4"/></Button>
    </form>
  );
}

function PlanDialog({ plan, onClose, onSaved }: { plan?: Plan; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState<any>(plan ?? { title: "", notes: "", status: "active", planned_for: "", total_budget: 0 });
  async function save() {
    if (!form.title?.trim()) return toast.error("Judul wajib diisi");
    const payload: any = {
      title: form.title, notes: form.notes || null, status: form.status,
      planned_for: form.planned_for || null, total_budget: Number(form.total_budget) || 0,
    };
    if (plan) {
      const { error } = await supabase.from("payment_plans").update(payload).eq("id", plan.id);
      if (error) return toast.error(error.message);
    } else {
      if (!user) return toast.error("Belum login");
      const { error } = await supabase.from("payment_plans").insert({ ...payload, user_id: user.id });
      if (error) return toast.error(error.message);
    }
    toast.success("Tersimpan"); onSaved();
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{plan ? "Edit plan" : "Plan baru"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Judul</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Belanja pasar"/></div>
          <div><Label>Catatan</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opsional"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tanggal rencana</Label><Input type="date" value={form.planned_for ?? ""} onChange={(e) => setForm({ ...form, planned_for: e.target.value })}/></div>
            <div><Label>Budget (Rp)</Label><Input type="number" value={form.total_budget ?? 0} onChange={(e) => setForm({ ...form, total_budget: e.target.value })}/></div>
          </div>
          {plan && (
            <div>
              <Label>Status</Label>
              <select className="w-full bg-background border border-border rounded-md h-9 px-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Aktif</option>
                <option value="done">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
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

function ItemDialog({ item, onClose, onSaved }: { item: Item; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(item);
  async function save() {
    const payload: any = {
      name: form.name, qty: Number(form.qty) || 1, unit: form.unit || null,
      est_price: Number(form.est_price) || 0,
      actual_price: form.actual_price === "" || form.actual_price == null ? null : Number(form.actual_price),
      status: form.status, note: form.note || null,
    };
    const { error } = await supabase.from("payment_plan_items").update(payload).eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Tersimpan"); onSaved();
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Qty</Label><Input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })}/></div>
            <div><Label>Satuan</Label><Input value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, pcs"/></div>
            <div><Label>Status</Label>
              <select className="w-full bg-background border border-border rounded-md h-9 px-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Belum</option>
                <option value="bought">Sudah</option>
                <option value="skipped">Tidak jadi</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Harga estimasi</Label><Input type="number" value={form.est_price} onChange={(e) => setForm({ ...form, est_price: e.target.value })}/></div>
            <div><Label>Harga aktual</Label><Input type="number" value={form.actual_price ?? ""} onChange={(e) => setForm({ ...form, actual_price: e.target.value })}/></div>
          </div>
          <div><Label>Catatan</Label><Textarea value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Misal: tidak jadi beli karena mahal"/></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={save} className="bg-gradient-money text-primary-foreground">Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}