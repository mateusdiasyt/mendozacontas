"use client";

import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

type Variant = "default" | "primary" | "success" | "warning" | "danger" | "violet" | "amber";

const variants: Record<
  Variant,
  { bg: string; iconBg: string; iconColor: string; border: string }
> = {
  default: {
    bg: "bg-white",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    border: "border-slate-100",
  },
  primary: {
    bg: "bg-white",
    iconBg: "bg-[var(--primary-light)]",
    iconColor: "text-[var(--primary)]",
    border: "border-teal-100",
  },
  success: {
    bg: "bg-white",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    border: "border-emerald-100",
  },
  warning: {
    bg: "bg-white",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    border: "border-amber-100",
  },
  danger: {
    bg: "bg-white",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    border: "border-red-100",
  },
  violet: {
    bg: "bg-white",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    border: "border-violet-100",
  },
  amber: {
    bg: "bg-white",
    iconBg: "bg-amber-50/80",
    iconColor: "text-amber-700",
    border: "border-amber-100",
  },
};

type Props = {
  title: string;
  value: string | number | ReactNode;
  subtitle?: string;
  variant?: Variant;
  icon: LucideIcon;
  className?: string;
};

export function BankCard({
  title,
  value,
  subtitle,
  variant = "default",
  icon: Icon,
  className = "",
}: Props) {
  const v = variants[variant];
  return (
    <div
      className={`rounded-2xl border ${v.border} ${v.bg} p-5 shadow-card transition-all hover:shadow-card-hover ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${v.iconBg} ${v.iconColor}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">
            {value}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
