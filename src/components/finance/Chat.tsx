import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/finance/device";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import type { FinanceData } from "@/lib/finance/queries";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE = "dompet_chat";

export function Chat({ data, balance }: { data: FinanceData; balance: number }) {
  const [messages, setMessages] = useState<Msg[]>(()=>{
    if (typeof window==="undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ localStorage.setItem(STORAGE, JSON.stringify(messages)); endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  async function send() {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    const userMsg: Msg = { role:"user", content:text };
    setMessages(p=>[...p, userMsg]);
    setBusy(true);

    const snapshot = {
      today: new Date().toISOString().slice(0,10),
      balance,
      incomes: data.incomes,
      bills: data.bills,
      debts: data.debts,
      expenses: data.expenses.slice(0, 50),
    };

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finance-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg], snapshot }),
      });
      if (resp.status === 429) { toast.error("Terlalu banyak permintaan, tunggu sebentar."); setBusy(false); return; }
      if (resp.status === 402) { toast.error("Kredit AI habis."); setBusy(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Stream gagal");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ""; let acc = "";
      setMessages(p=>[...p,{role:"assistant",content:""}]);

      let done=false;
      while(!done){
        const {done:d, value} = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, {stream:true});
        let i;
        while((i = buffer.indexOf("\n")) !== -1){
          let line = buffer.slice(0,i); buffer = buffer.slice(i+1);
          if (line.endsWith("\r")) line = line.slice(0,-1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) { acc += c; setMessages(prev => prev.map((m,idx)=> idx===prev.length-1 ? {...m, content: acc} : m)); }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }

      // persist to db (fire and forget)
      const dev = getDeviceId();
      supabase.from("chat_messages").insert([
        { device_id: dev, role: "user", content: text },
        { device_id: dev, role: "assistant", content: acc },
      ]).then(()=>{});
    } catch (e:any) {
      toast.error("Gagal: " + (e?.message ?? "error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-gradient-card rounded-2xl border border-border shadow-card flex flex-col h-[600px]">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-gradient-money grid place-items-center shadow-glow">
            <Sparkles className="size-4 text-primary-foreground"/>
          </div>
          <div>
            <div className="font-bold leading-tight">Asisten Keuangan</div>
            <div className="text-[11px] text-muted-foreground">AI realistis, paham keuanganmu</div>
          </div>
        </div>
        {messages.length>0 && (
          <Button size="icon" variant="ghost" onClick={()=>{setMessages([]); localStorage.removeItem(STORAGE);}}>
            <Trash2 className="size-4"/>
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length===0 && (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Halo 👋 Coba tanyakan:</p>
            <div className="grid gap-2">
              {[
                "Berapa budget harian saya sampai gajian berikutnya?",
                "Tagihan mana yang harus saya bayar duluan?",
                "Bagaimana cara hemat dari pengeluaran rokok saya?",
              ].map(q=>(
                <button key={q} onClick={()=>setInput(q)} className="text-left bg-card border border-border rounded-lg px-3 py-2 hover:border-primary/50 transition">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m,i)=>(
          <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role==="user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card border border-border rounded-bl-sm"
            }`}>
              {m.role==="assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none [&>*]:my-1 [&_p]:leading-relaxed [&_table]:text-xs">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              ) : <span className="whitespace-pre-wrap">{m.content}</span>}
            </div>
          </div>
        ))}
        <div ref={endRef}/>
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }}}
          placeholder="Tanyakan apa saja tentang uangmu…"
          disabled={busy}
        />
        <Button onClick={send} disabled={busy || !input.trim()} className="bg-gradient-money text-primary-foreground hover:opacity-90">
          <Send className="size-4"/>
        </Button>
      </div>
    </div>
  );
}
