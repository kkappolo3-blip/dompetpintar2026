const KEY = "dompet_balance";
export function getBalance(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(KEY) ?? 0);
}
export function setBalance(n: number) {
  localStorage.setItem(KEY, String(n));
  window.dispatchEvent(new Event("balance-changed"));
}
