// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Kamu adalah Asisten Keuangan Pribadi Realistis berbahasa Indonesia.
Tugasmu:
- Bantu pengguna kelola cashflow harian dengan realistis dan manusiawi
- Hitung sisa uang, budget harian sampai pemasukan berikutnya
- Prioritas tagihan wajib (anak, sekolah, listrik, internet, cicilan) dan hutang mendesak
- Saran hemat konkret (rokok, jajan, dll) dengan angka spesifik
- Bahasa santai, padat, hindari istilah akuntansi formal
- Format jawaban ringkas, gunakan tabel/angka bila perlu
- Selalu beri perhitungan budget harian yang tepat
- Jangan menggurui, beri saran yang bisa langsung diterapkan

Konteks keuangan pengguna saat ini akan diberikan di pesan sistem berikutnya. Gunakan data tersebut untuk semua perhitungan.`;

function rupiah(n: number) {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

function buildContext(snapshot: any): string {
  if (!snapshot) return "";
  const { incomes = [], bills = [], debts = [], expenses = [], balance = 0, today } = snapshot;
  const lines: string[] = [];
  lines.push(`Tanggal hari ini: ${today}`);
  lines.push(`Saldo saat ini: ${rupiah(balance)}`);

  if (incomes.length) {
    lines.push(`\nPemasukan terjadwal:`);
    incomes.forEach((i: any) => lines.push(`- ${i.name}: ${rupiah(i.amount)} pada ${i.date_received} (${i.recurrence})`));
  }
  if (bills.length) {
    lines.push(`\nTagihan:`);
    bills.forEach((b: any) => lines.push(`- ${b.name} (${b.category}): ${rupiah(b.amount)} jatuh tempo ${b.due_date}${b.paid ? " [LUNAS]" : ""}`));
  }
  if (debts.length) {
    lines.push(`\nHutang:`);
    debts.forEach((d: any) => lines.push(`- ${d.creditor}: sisa ${rupiah(d.remaining)} dari ${rupiah(d.total_amount)} (prioritas ${d.priority})${d.notes ? " - " + d.notes : ""}`));
  }
  if (expenses.length) {
    const total = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
    lines.push(`\nPengeluaran 30 hari terakhir (total ${rupiah(total)}):`);
    const byCat: Record<string, number> = {};
    expenses.forEach((e: any) => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
    Object.entries(byCat).forEach(([k, v]) => lines.push(`- ${k}: ${rupiah(v)}`));
  }
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, snapshot } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const contextMsg = buildContext(snapshot);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: `Data keuangan pengguna:\n${contextMsg}` },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "Terlalu banyak permintaan, coba lagi sebentar." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "Kredit AI habis. Tambah kredit di pengaturan workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
