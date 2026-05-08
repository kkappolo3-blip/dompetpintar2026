import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/finance/device";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function QuickAdd({ onAdded }: { onAdded: () => void }) {
  const device_id = getDeviceId();
  const [busy, setBusy] = useState(false);

  // expense
  const [exCat, setExCat] = useState("makan");
  const [exAmount, setExAmount] = useState("");
  const [exNote, setExNote] = useState("");

  // income
  const [inName, setInName] = useState("");
  const [inAmount, setInAmount] = useState("");
  const [inDate, setInDate] = useState(new Date().toISOString().slice(0, 10));

  // bill
  const [biName, setBiName] = useState("");
  const [biAmount, setBiAmount] = useState("");
  const [biDate, setBiDate] = useState("");
  const [biCat, setBiCat] = useState("umum");

  // debt
  const [dbCred, setDbCred] = useState("");
  const [dbTotal, setDbTotal] = useState("");
  const [dbPrio, setDbPrio] = useState("3");

  async function add(table: string, payload: any) {
    setBusy(true);
    const { error } = await supabase.from(table as any).insert({ device_id, ...payload });
    setBusy(false);
    if (error) return toast.error("Gagal menyimpan: " + error.message);
    toast.success("Tersimpan");
    onAdded();
  }

  return (
    <div className="bg-gradient-card rounded-2xl border border-border p-5 shadow-card">
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Plus className="size-5 text-primary"/> Catat cepat</h2>
      <Tabs defaultValue="expense">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="expense">Keluar</TabsTrigger>
          <TabsTrigger value="income">Masuk</TabsTrigger>
          <TabsTrigger value="bill">Tagihan</TabsTrigger>
          <TabsTrigger value="debt">Hutang</TabsTrigger>
        </TabsList>

        <TabsContent value="expense" className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kategori</Label>
              <Select value={exCat} onValueChange={setExCat}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["makan","rokok","bensin","jajan anak","transport","lainnya"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jumlah (Rp)</Label>
              <Input inputMode="numeric" value={exAmount} onChange={e=>setExAmount(e.target.value.replace(/\D/g,""))} placeholder="20000"/>
            </div>
          </div>
          <div>
            <Label>Catatan (opsional)</Label>
            <Input value={exNote} onChange={e=>setExNote(e.target.value)} maxLength={100}/>
          </div>
          <Button disabled={busy || !exAmount} className="w-full" onClick={async ()=>{
            await add("expenses",{category:exCat,amount:Number(exAmount),note:exNote||null});
            setExAmount(""); setExNote("");
          }}>Simpan pengeluaran</Button>
        </TabsContent>

        <TabsContent value="income" className="space-y-3 pt-3">
          <div>
            <Label>Nama</Label>
            <Input value={inName} onChange={e=>setInName(e.target.value)} placeholder="Gaji / Tunjangan"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Jumlah</Label><Input inputMode="numeric" value={inAmount} onChange={e=>setInAmount(e.target.value.replace(/\D/g,""))}/></div>
            <div><Label>Tanggal</Label><Input type="date" value={inDate} onChange={e=>setInDate(e.target.value)}/></div>
          </div>
          <Button disabled={busy||!inName||!inAmount} className="w-full" onClick={async()=>{
            await add("incomes",{name:inName,amount:Number(inAmount),date_received:inDate});
            setInName(""); setInAmount("");
          }}>Simpan pemasukan</Button>
        </TabsContent>

        <TabsContent value="bill" className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nama</Label><Input value={biName} onChange={e=>setBiName(e.target.value)} placeholder="Listrik"/></div>
            <div>
              <Label>Kategori</Label>
              <Select value={biCat} onValueChange={setBiCat}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["wajib","anak","cicilan","umum"].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Jumlah</Label><Input inputMode="numeric" value={biAmount} onChange={e=>setBiAmount(e.target.value.replace(/\D/g,""))}/></div>
            <div><Label>Jatuh tempo</Label><Input type="date" value={biDate} onChange={e=>setBiDate(e.target.value)}/></div>
          </div>
          <Button disabled={busy||!biName||!biAmount||!biDate} className="w-full" onClick={async()=>{
            await add("bills",{name:biName,amount:Number(biAmount),due_date:biDate,category:biCat});
            setBiName(""); setBiAmount(""); setBiDate("");
          }}>Simpan tagihan</Button>
        </TabsContent>

        <TabsContent value="debt" className="space-y-3 pt-3">
          <div><Label>Kepada</Label><Input value={dbCred} onChange={e=>setDbCred(e.target.value)} placeholder="Bank / Saudara"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Sisa hutang</Label><Input inputMode="numeric" value={dbTotal} onChange={e=>setDbTotal(e.target.value.replace(/\D/g,""))}/></div>
            <div>
              <Label>Prioritas</Label>
              <Select value={dbPrio} onValueChange={setDbPrio}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Sangat Mendesak</SelectItem>
                  <SelectItem value="2">2 - Mendesak</SelectItem>
                  <SelectItem value="3">3 - Normal</SelectItem>
                  <SelectItem value="4">4 - Santai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button disabled={busy||!dbCred||!dbTotal} className="w-full" onClick={async()=>{
            const t=Number(dbTotal);
            await add("debts",{creditor:dbCred,total_amount:t,remaining:t,priority:Number(dbPrio)});
            setDbCred(""); setDbTotal("");
          }}>Simpan hutang</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
