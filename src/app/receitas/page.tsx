"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import { TrendingUp, ArrowLeft, Plus, FileText } from "lucide-react";

type ReceitaItem = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: string;
  contexto: string;
  observacao: string | null;
};

const TIPOS = [
  { value: "FIXA", label: "Fixa" },
  { value: "EXTRA", label: "Extra" },
  { value: "ARCADE_DIARIA", label: "Arcade (diária)" },
  { value: "REPASSE", label: "Repasse" },
];

export default function ReceitasPage() {
  const [token, setToken] = useState<string | null>(null);
  const [list, setList] = useState<ReceitaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    tipo: "EXTRA",
    contexto: "PESSOAL" as "PESSOAL" | "ARCADE",
    observacao: "",
  });

  useEffect(() => {
    setToken(typeof window !== "undefined" ? localStorage.getItem("mendozacontas_token") : null);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/receitas", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [token]);

  function loadList() {
    if (!token) return;
    fetch("/api/receitas", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setList(Array.isArray(data) ? data : []));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const valor = parseFloat(form.valor.replace(",", "."));
    if (!form.descricao.trim() || isNaN(valor) || valor <= 0) {
      setError("Preencha descrição e valor válido.");
      return;
    }
    setSaving(true);
    fetch("/api/receitas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        descricao: form.descricao.trim(),
        valor,
        data: form.data,
        tipo: form.tipo,
        contexto: form.contexto,
        observacao: form.observacao.trim() || undefined,
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error ?? "Erro")));
        return res.json();
      })
      .then(() => {
        setForm({ ...form, descricao: "", valor: "", observacao: "" });
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
            <Link href="/login" className="font-medium text-[var(--primary)] underline">
              Faça login
            </Link>{" "}
            para cadastrar receitas.
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
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Receitas</h1>
              <p className="text-sm text-slate-500">Entradas de dinheiro</p>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <TrendingUp className="h-4 w-4" />
            Nova receita
          </h2>
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Descrição *</label>
              <input
                type="text"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Valor (R$) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="0,00"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Data *</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Contexto</label>
              <select
                value={form.contexto}
                onChange={(e) => setForm({ ...form, contexto: e.target.value as "PESSOAL" | "ARCADE" })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value="PESSOAL">Pessoal</option>
                <option value="ARCADE">Arcade</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Observação</label>
              <input
                type="text"
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {saving ? "Salvando…" : "Adicionar receita"}
              </button>
            </div>
          </form>
        </div>

        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FileText className="h-4 w-4" />
          Últimas receitas
        </h2>
        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : list.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-card">
            Nenhuma receita cadastrada. Use o formulário acima para adicionar.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80">
                <tr>
                  <th className="p-4 font-medium text-slate-600">Data</th>
                  <th className="p-4 font-medium text-slate-600">Descrição</th>
                  <th className="p-4 font-medium text-slate-600">Tipo</th>
                  <th className="p-4 font-medium text-slate-600">Contexto</th>
                  <th className="p-4 text-right font-medium text-slate-600">Valor</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 transition hover:bg-slate-50/50 last:border-0">
                    <td className="p-4 text-slate-600">{r.data}</td>
                    <td className="p-4 font-medium text-slate-900">{r.descricao}</td>
                    <td className="p-4 text-slate-600">{r.tipo}</td>
                    <td className="p-4 text-slate-600">{r.contexto}</td>
                    <td className="p-4 text-right font-semibold text-emerald-600">
                      +{formatCurrency(r.valor)}
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
