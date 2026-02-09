"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  Store,
  TrendingUp,
  Target,
  AlertCircle,
  CreditCard,
  PiggyBank,
  ArrowRightLeft,
  Plus,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BankCard } from "@/components/ui/BankCard";
import { FluxoChart } from "@/components/charts/FluxoChart";
import { CategoriasChart } from "@/components/charts/CategoriasChart";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";

type DashboardData = {
  saldoPessoalAtual: number;
  lucroArcadeMes: number;
  projecaoArcadeMes: number;
  mediaDiariaArcade: number;
  projecaoFechamentoPessoal: number;
  status: "OK" | "ATENCAO" | "CRITICO";
  extraNecessario: number;
  totalFaturaCartoes?: number;
  quantoPodeGastar?: number;
  contexto: string;
  periodo: { diasNoMes: number; diaAtual: number };
  chart?: {
    fluxoPorDia: Array<{ date: string; receita: number; despesa: number; saldo: number }>;
    categoriasChart: Array<{ name: string; value: number }>;
  };
};

const defaultData: DashboardData = {
  saldoPessoalAtual: 0,
  lucroArcadeMes: 0,
  projecaoArcadeMes: 0,
  mediaDiariaArcade: 0,
  projecaoFechamentoPessoal: 0,
  status: "OK",
  extraNecessario: 0,
  totalFaturaCartoes: 0,
  quantoPodeGastar: 0,
  contexto: "PESSOAL",
  periodo: { diasNoMes: 30, diaAtual: 1 },
};

const statusConfig = {
  OK: { label: "Tudo certo", icon: AlertCircle, color: "text-emerald-600 bg-emerald-50" },
  ATENCAO: { label: "Atenção", icon: AlertCircle, color: "text-amber-600 bg-amber-50" },
  CRITICO: { label: "Crítico", icon: AlertCircle, color: "text-red-600 bg-red-50" },
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
  const status = statusConfig[d.status];

  return (
    <div className="min-h-screen bg-surface-app">
      <AppHeader
        token={token}
        onLogout={() => {
          localStorage.removeItem("mendozacontas_token");
          localStorage.removeItem("mendozacontas_user");
          setToken(null);
          setData(defaultData);
        }}
      />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {token && (
          <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
            <span className="text-sm font-medium text-slate-500">Ações rápidas</span>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/receitas"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-600"
              >
                <Plus className="h-4 w-4" />
                Receita
              </Link>
              <Link
                href="/despesas"
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-600"
              >
                <Plus className="h-4 w-4" />
                Despesa
              </Link>
              <Link
                href="/cartoes"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <CreditCard className="h-4 w-4" />
                Cartões
              </Link>
              <Link
                href="/repasse"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Repasse
              </Link>
            </div>
          </div>
        )}

        {!token && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-800">
            <p className="text-sm font-medium">Faça login para ver seus dados.</p>
            <p className="mt-1 text-sm opacity-90">Os valores abaixo são apenas ilustrativos.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
          Visão geral
        </h1>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
            ))}
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="animate-card-enter opacity-0" style={{ animationDelay: "0ms" }}>
                <BankCard
                  title="Saldo pessoal (mês)"
                  value={formatCurrency(d.saldoPessoalAtual)}
                  subtitle="Receitas − despesas"
                  variant={d.saldoPessoalAtual >= 0 ? "success" : "danger"}
                  icon={Wallet}
                />
              </div>
              <div className="animate-card-enter opacity-0" style={{ animationDelay: "60ms" }}>
                <BankCard
                  title="Lucro Arcade (mês)"
                  value={formatCurrency(d.lucroArcadeMes)}
                  subtitle="Negócio"
                  variant={d.lucroArcadeMes >= 0 ? "success" : "danger"}
                  icon={Store}
                />
              </div>
              <div className="animate-card-enter opacity-0" style={{ animationDelay: "120ms" }}>
                <BankCard
                  title="Projeção de fechamento"
                  value={formatCurrency(d.projecaoFechamentoPessoal)}
                  subtitle="Previsão fim do mês"
                  variant={
                    d.projecaoFechamentoPessoal >= 0
                      ? "success"
                      : d.projecaoFechamentoPessoal >= -500
                        ? "warning"
                        : "danger"
                  }
                  icon={Target}
                />
              </div>
              <div
                className={d.status === "CRITICO" ? "card-enter-then-pulse rounded-2xl" : "animate-card-enter opacity-0"}
                style={{ animationDelay: d.status === "CRITICO" ? undefined : "180ms" }}
              >
                <BankCard
                  title="Status"
                  value={
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium ${status.color} ${d.status === "CRITICO" ? "animate-glow-red" : ""} ${d.status === "ATENCAO" ? "animate-glow-amber" : ""}`}
                    >
                      <status.icon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                  }
                  variant="default"
                  icon={AlertCircle}
                />
              </div>
              <div className="animate-card-enter opacity-0" style={{ animationDelay: "240ms" }}>
                <BankCard
                  title="Quanto pode gastar"
                  value={formatCurrency(d.quantoPodeGastar ?? 0)}
                  subtitle="Margem livre (após faturas)"
                  variant={(d.quantoPodeGastar ?? 0) > 0 ? "success" : "default"}
                  icon={PiggyBank}
                />
              </div>
              <div className="animate-card-enter opacity-0" style={{ animationDelay: "300ms" }}>
                <BankCard
                  title="Fatura dos cartões"
                  value={formatCurrency(d.totalFaturaCartoes ?? 0)}
                  subtitle="Ciclo atual"
                  variant="violet"
                  icon={CreditCard}
                />
              </div>
              <div className="animate-card-enter opacity-0" style={{ animationDelay: "360ms" }}>
                <BankCard
                  title="Projeção Arcade (mês)"
                  value={formatCurrency(d.projecaoArcadeMes)}
                  subtitle={`Média diária: ${formatCurrency(d.mediaDiariaArcade)}`}
                  variant="primary"
                  icon={TrendingUp}
                />
              </div>
              <div className="animate-card-enter opacity-0" style={{ animationDelay: "420ms" }}>
                <BankCard
                  title="Extra necessário"
                  value={formatCurrency(d.extraNecessario)}
                  subtitle="Para fechar no azul"
                  variant={d.extraNecessario > 0 ? "warning" : "default"}
                  icon={TrendingUp}
                />
              </div>
            </div>

            {d.chart && (
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <h2 className="mb-3 text-sm font-semibold text-slate-700">
                    Fluxo do mês (receitas x despesas)
                  </h2>
                  <FluxoChart data={d.chart.fluxoPorDia} />
                </div>
                <div>
                  <h2 className="mb-3 text-sm font-semibold text-slate-700">
                    Despesas por categoria
                  </h2>
                  <CategoriasChart data={d.chart.categoriasChart} />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
