"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowLeftRight,
  LogOut,
  LogIn,
} from "lucide-react";

type Props = {
  token: string | null;
  onLogout?: () => void;
};

const navItems = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/receitas", label: "Receitas", icon: TrendingUp },
  { href: "/despesas", label: "Despesas", icon: TrendingDown },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/repasse", label: "Repasse", icon: ArrowLeftRight },
];

export function AppHeader({ token, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-200/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
            M
          </span>
          <span className="hidden sm:inline">MendozaContas</span>
        </Link>

        {token && (
          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {token ? (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)]"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
