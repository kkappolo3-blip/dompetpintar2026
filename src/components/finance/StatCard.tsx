import { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "money" | "warn" | "danger";
  icon?: ReactNode;
}

export function StatCard({ label, value, hint, tone = "default", icon }: Props) {
  const toneClass =
    tone === "money"
      ? "border-primary/40 shadow-glow"
      : tone === "warn"
      ? "border-warning/40"
      : tone === "danger"
      ? "border-destructive/50"
      : "border-border";

  const valueColor =
    tone === "money" ? "text-money" : tone === "warn" ? "text-warning" : tone === "danger" ? "text-destructive" : "text-foreground";

  return (
    <div className={`bg-gradient-card rounded-2xl border ${toneClass} p-5 shadow-card transition hover:translate-y-[-1px]`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className={`mt-2 text-2xl md:text-3xl font-bold num ${valueColor}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
