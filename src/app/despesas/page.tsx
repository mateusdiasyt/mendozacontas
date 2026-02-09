"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import { TrendingDown, ArrowLeft } from "lucide-react";

type DespesaItem = {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  formaPagamento: string;
  contexto: string;
  recorrente: boolean;
};

const FORMAS = [
  { value: "PIX", label: "PIX" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "CARTAO", label: "Cartão" },
];

export default function DespesasPage() {
  const [token, setToken] = useState<string | null>(null);
  const [list, setList] = useState<DespesaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    categoria: "",
    data: new Date().toISOString().slice(0, 10),
    formaPagamento: "PIX" as "PIX" | "DINHEIRO" | "CARTAO",
    contexto: "PESSOAL" as "PESSOAL" | "ARCADE",
    recorrente: false,
  });

  useEffect(() => {
    setToken(typeof window !== "undefined" ? localStorage.getItem("mendozacontas_token") : null);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/despesas", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [token]);

  function loadList() {
    if (!token) return;
    fetch("/api/despesas", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setList(Array.isArray(data) ? data : []));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const valor = parseFloat(form.valor.replace(",", "."));
    if (!form.descricao.trim() || isNaN(valor) || valor <= 0 || !form.categoria.trim()) {
      setError("Preencha descrição, valor e categoria.");
      return;
    }
    setSaving(true);
    fetch("/api/despesas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        descricao: form.descricao.trim(),
        valor,
        categoria: form.categoria.trim(),
        data: form.data,
        formaPagamento: form.formaPagamento,
        contexto: form.contexto,
        recorrente: form.recorrente,
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error ?? "Erro")));
        return res.json();
      })
      .then(() => {
        setForm({ ...form, descricao: "", valor: "", categoria: "" });
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
            para cadastrar despesas.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-app">
        <AppHeader
        token={token}
        onLogout={() => {
          localStorage.removeItem("mendozacontas_token");
          setToken(null);
        }}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 shadow-card bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Despesas</h1>
            <p className="text-sm text-slate-500">Saídas de dinheiro</p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <TrendingDown className="h-4 w-4" />
            Nova despesa
          </h2>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm text-slate-600">Descrição *</label>
              <input
                type="text"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Valor (R$) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="0,00"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Categoria *</label>
              <input
                type="text"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Ex: Alimentação, Transporte"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Data *</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Forma de pagamento</label>
              <select
                value={form.formaPagamento}
                onChange={(e) =>
                  setForm({ ...form, formaPagamento: e.target.value as "PIX" | "DINHEIRO" | "CARTAO" })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {FORMAS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600">Contexto</label>
              <select
                value={form.contexto}
                onChange={(e) => setForm({ ...form, contexto: e.target.value as "PESSOAL" | "ARCADE" })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="PESSOAL">Pessoal</option>
                <option value="ARCADE">Arcade</option>
              </select>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="recorrente"
                checked={form.recorrente}
                onChange={(e) => setForm({ ...form, recorrente: e.target.checked })}
                className="rounded border-slate-300"
              />
              <label htmlFor="recorrente" className="text-sm text-slate-600">
                Despesa recorrente
              </label>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-rose-600 px-4 py-2 font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Adicionar despesa"}
              </button>
            </div>
          </form>
        </div>

        <h2 className="mb-3 text-sm font-medium text-slate-700">Últimas despesas</h2>
        {loading ? (
          <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
        ) : list.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 shadow-card bg-white p-6 text-slate-500">
            Nenhuma despesa cadastrada. Use o formulário acima para adicionar.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-card bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="p-3 font-medium">Data</th>
                  <th className="p-3 font-medium">Descrição</th>
                  <th className="p-3 font-medium">Categoria</th>
                  <th className="p-3 font-medium">Forma</th>
                  <th className="p-3 font-medium">Contexto</th>
                  <th className="p-3 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3 text-slate-600">{d.data}</td>
                    <td className="p-3">{d.descricao}</td>
                    <td className="p-3 text-slate-600">{d.categoria}</td>
                    <td className="p-3 text-slate-600">{d.formaPagamento}</td>
                    <td className="p-3 text-slate-600">{d.contexto}</td>
                    <td className="p-3 text-right font-medium text-rose-700">
                      {formatCurrency(d.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
