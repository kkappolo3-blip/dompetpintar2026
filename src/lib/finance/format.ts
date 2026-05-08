export const rupiah = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return "Rp" + Math.round(v).toLocaleString("id-ID");
};
export const shortRupiah = (n: number) => {
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return "Rp" + (v / 1_000_000).toFixed(1) + "jt";
  if (Math.abs(v) >= 1_000) return "Rp" + (v / 1_000).toFixed(0) + "rb";
  return "Rp" + v;
};
export const dateID = (d: string | Date) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};
export const daysUntil = (date: string) => {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
};
