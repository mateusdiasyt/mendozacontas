"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import Link from "next/link";
import { CreditCard, ArrowLeft } from "lucide-react";
import { CreditCardVisual, type LayoutCartao } from "@/components/ui/CreditCardVisual";

type CartaoItem = {
  id: string;
  nome: string;
  limite: number;
  fechamento: number;
  vencimento: number;
  layout?: LayoutCartao;
  contexto: string;
  totalLancamentos: number;
};

export default function CartoesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [list, setList] = useState<CartaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nome: "",
    limite: "",
    fechamento: "10",
    vencimento: "15",
    layout: "GENERICO" as LayoutCartao,
    contexto: "PESSOAL" as "PESSOAL" | "ARCADE",
  });

  useEffect(() => {
    setToken(typeof window !== "undefined" ? localStorage.getItem("mendozacontas_token") : null);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/cartoes", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [token]);

  function loadList() {
    if (!token) return;
    fetch("/api/cartoes", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setList(Array.isArray(data) ? data : []));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const limite = parseFloat(form.limite.replace(",", "."));
    if (!form.nome.trim() || isNaN(limite) || limite < 0) {
      setError("Preencha o nome e um limite válido.");
      return;
    }
    setSaving(true);
    fetch("/api/cartoes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nome: form.nome.trim(),
        limite,
        fechamento: parseInt(form.fechamento, 10) || 10,
        vencimento: parseInt(form.vencimento, 10) || 15,
        layout: form.layout,
        contexto: form.contexto,
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error ?? "Erro")));
        return res.json();
      })
      .then(() => {
        setForm({ ...form, nome: "", limite: "" });
        loadList();
      })
      .catch((err) => setError(err.message ?? "Erro ao salvar"))
      .finally(() => setSaving(false));
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-surface-app">
        <AppHeader token={null} />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-slate-600">
            <Link href="/login" className="font-medium text-slate-800 underline">
              Faça login
            </Link>{" "}
            para gerenciar cartões.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-app">
      <AppHeader token={token} onLogout={() => { localStorage.removeItem("mendozacontas_token"); localStorage.removeItem("mendozacontas_user"); setToken(null); }} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/dashboard" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 shadow-card bg-white text-slate-600 shadow-sm hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cartões de crédito</h1>
            <p className="text-sm text-slate-500">Faturas e compras</p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CreditCard className="h-4 w-4" />
            Novo cartão
          </h2>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-sm text-slate-600">Nome do cartão *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Nubank, Itaú, Riachuelo"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Aparência</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {(["GENERICO", "NUBANK", "ITAU"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setForm({ ...form, layout: l })}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      form.layout === l
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {l === "NUBANK" ? "Nubank" : l === "ITAU" ? "Itaú" : "Genérico"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600">Limite (R$) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.limite}
                onChange={(e) => setForm({ ...form, limite: e.target.value })}
                placeholder="0,00"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Dia fechamento (1-31)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.fechamento}
                onChange={(e) => setForm({ ...form, fechamento: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Dia vencimento (1-31)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.vencimento}
                onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Contexto</label>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50/80 p-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, contexto: "PESSOAL" })}
                  className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${
                    form.contexto === "PESSOAL"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Pessoal
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, contexto: "ARCADE" })}
                  className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${
                    form.contexto === "ARCADE"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Arcade
                </button>
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 font-medium text-white shadow-sm hover:bg-violet-600 disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Adicionar cartão"}
              </button>
            </div>
          </form>
        </div>

        <h2 className="mb-3 text-sm font-medium text-slate-700">Meus cartões</h2>
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
        ) : list.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 shadow-card bg-white p-6 text-slate-500">
            Nenhum cartão cadastrado. Use o formulário acima para adicionar.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <Link
                key={c.id}
                href={`/cartoes/${c.id}`}
                className="group block transition hover:scale-[1.02]"
              >
                <CreditCardVisual
                  nome={c.nome}
                  limite={c.limite}
                  fechamento={c.fechamento}
                  vencimento={c.vencimento}
                  layout={c.layout ?? "GENERICO"}
                  contexto={c.contexto}
                  className="shadow-lg transition group-hover:shadow-xl"
                />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
