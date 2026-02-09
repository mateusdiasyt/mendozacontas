import { ReactNode } from "react";

type Props = {
  title: string;
  value: string | number | ReactNode;
  subtitle?: string;
  variant?: "default" | "success" | "warning" | "danger";
  icon?: ReactNode;
};

const variantStyles = {
  default: "border-slate-200 bg-white text-slate-800",
  success: "border-emerald-200 bg-emerald-50/80 text-emerald-800",
  warning: "border-amber-200 bg-amber-50/80 text-amber-800",
  danger: "border-red-200 bg-red-50/80 text-red-800",
};

export function DashboardCard({ title, value, subtitle, variant = "default", icon }: Props) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm transition hover:shadow ${variantStyles[variant]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium opacity-90">{title}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs opacity-75">{subtitle}</p>}
        </div>
        {icon && <div className="shrink-0 opacity-70">{icon}</div>}
      </div>
    </div>
  );
}
