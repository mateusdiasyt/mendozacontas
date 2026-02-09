"use client";

import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/format";

type DashboardData = {
  saldoPessoalAtual: number;
  lucroArcadeMes: number;
  projecaoArcadeMes: number;
  mediaDiariaArcade: number;
  projecaoFechamentoPessoal: number;
  status: "OK" | "ATENCAO" | "CRITICO";
  extraNecessario: number;
  contexto: string;
  periodo: { diasNoMes: number; diaAtual: number };
};

const defaultData: DashboardData = {
  saldoPessoalAtual: 0,
  lucroArcadeMes: 0,
  projecaoArcadeMes: 0,
  mediaDiariaArcade: 0,
  projecaoFechamentoPessoal: 0,
  status: "OK",
  extraNecessario: 0,
  contexto: "PESSOAL",
  periodo: { diasNoMes: 30, diaAtual: 1 },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("mendozacontas_token") : null;
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) {
      setData(defaultData);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/dashboard?contexto=PESSOAL", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setData(defaultData);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const d = data ?? defaultData;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">MendozaContas</h1>
          <div className="flex items-center gap-3">
            {token ? (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("mendozacontas_token");
                  setToken(null);
                  setData(defaultData);
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Sair
              </button>
            ) : (
              <a
                href="/login"
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Entrar
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {!token && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            Faça login para ver seus dados reais. Os valores abaixo são apenas ilustrativos.
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        <h2 className="mb-6 text-lg font-semibold text-slate-700">Visão geral</h2>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardCard
              title="Saldo pessoal (mês)"
              value={formatCurrency(d.saldoPessoalAtual)}
              subtitle="Receitas − despesas no contexto Pessoal"
              variant={d.saldoPessoalAtual >= 0 ? "success" : "danger"}
            />
            <DashboardCard
              title="Lucro Arcade (mês)"
              value={formatCurrency(d.lucroArcadeMes)}
              subtitle="Receitas − despesas no contexto Arcade"
              variant={d.lucroArcadeMes >= 0 ? "success" : "danger"}
            />
            <DashboardCard
              title="Projeção de fechamento"
              value={formatCurrency(d.projecaoFechamentoPessoal)}
              subtitle="Previsão pessoal para o fim do mês"
              variant={
                d.projecaoFechamentoPessoal >= 0
                  ? "success"
                  : d.projecaoFechamentoPessoal >= -500
                    ? "warning"
                    : "danger"
              }
            />
            <DashboardCard
              title="Status financeiro"
              value={<StatusBadge status={d.status} />}
              variant="default"
            />
            <DashboardCard
              title="Projeção Arcade (mês)"
              value={formatCurrency(d.projecaoArcadeMes)}
              subtitle={`Média diária: ${formatCurrency(d.mediaDiariaArcade)}`}
              variant="default"
            />
            <DashboardCard
              title="Extra necessário"
              value={formatCurrency(d.extraNecessario)}
              subtitle="Valor em extras para fechar no azul"
              variant={d.extraNecessario > 0 ? "warning" : "default"}
            />
          </div>
        )}
      </main>
    </div>
  );
}
