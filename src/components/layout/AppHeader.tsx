"use client";

import Link from "next/link";

type Props = {
  token: string | null;
  onLogout?: () => void;
};

export function AppHeader({ token, onLogout }: Props) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-slate-800 hover:text-slate-600">
            MendozaContas
          </Link>
          {token && (
            <>
              <Link
                href="/receitas"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Receitas
              </Link>
              <Link
                href="/despesas"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Despesas
              </Link>
              <Link
                href="/cartoes"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Cartões
              </Link>
              <Link
                href="/repasse"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Repasse
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {token ? (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Sair
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
