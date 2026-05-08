import { useEffect, useState } from "react";
import { getBalance, setBalance } from "@/lib/finance/balance";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wallet, Pencil, Check } from "lucide-react";
import { rupiah } from "@/lib/finance/format";

export function BalanceEditor({ onChange }: { onChange?: () => void }) {
  const [balance, setBal] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(()=>{
    setBal(getBalance());
    const h = ()=>setBal(getBalance());
    window.addEventListener("balance-changed", h);
    return ()=>window.removeEventListener("balance-changed", h);
  },[]);

  function save() {
    const n = Number(draft.replace(/\D/g,"")) || 0;
    setBalance(n);
    setBal(n);
    setEditing(false);
    onChange?.();
  }

  return (
    <div className="bg-gradient-money rounded-2xl p-6 shadow-glow text-primary-foreground">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80 font-semibold">
        <Wallet className="size-4"/> Saldo di tangan
      </div>
      {editing ? (
        <div className="mt-2 flex gap-2 items-center">
          <Input autoFocus inputMode="numeric" value={draft} onChange={e=>setDraft(e.target.value.replace(/\D/g,""))}
            placeholder="Masukkan saldo" className="bg-white/20 border-white/30 text-primary-foreground placeholder:text-primary-foreground/60 num text-2xl font-bold h-12"/>
          <Button size="icon" onClick={save} className="bg-white text-primary hover:bg-white/90"><Check/></Button>
        </div>
      ) : (
        <button onClick={()=>{setDraft(String(balance)); setEditing(true);}} className="mt-2 flex items-center gap-3 group">
          <span className="text-3xl md:text-4xl font-extrabold num">{rupiah(balance)}</span>
          <Pencil className="size-4 opacity-60 group-hover:opacity-100"/>
        </button>
      )}
      <div className="mt-1 text-xs opacity-75">Ketuk untuk ubah saldo aktual</div>
    </div>
  );
}
