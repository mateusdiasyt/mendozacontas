"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";

type CartaoDetail = {
  id: string;
  nome: string;
  limite: number;
  fechamento: number;
  vencimento: number;
  contexto: string;
  ciclo: { start: string; end: string };
  faturaAtual: number;
  lancamentos: Array<{
    id: string;
    descricao: string;
    valor: number;
    parcelas: number;
    parcelaAtual: number;
    categoria: string;
    dataCompra: string;
  }>;
};

export default function CartaoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [cartao, setCartao] = useState<CartaoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    parcelas: "1",
    categoria: "Outros",
    dataCompra: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    setToken(typeof window !== "undefined" ? localStorage.getItem("mendozacontas_token") : null);
  }, []);

  useEffect(() => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    fetch(`/api/cartoes/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Cartão não encontrado");
        return res.json();
      })
      .then(setCartao)
      .catch(() => setCartao(null))
      .finally(() => setLoading(false));
  }, [token, id]);

  function loadCartao() {
    if (!token || !id) return;
    fetch(`/api/cartoes/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.ok ? res.json() : null)
      .then(setCartao);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const valor = parseFloat(form.valor.replace(",", "."));
    if (!form.descricao.trim() || isNaN(valor) || valor <= 0) {
      setError("Preencha descrição e valor.");
      return;
    }
    setSaving(true);
    fetch(`/api/cartoes/${id}/lancamentos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        descricao: form.descricao.trim(),
        valor,
        parcelas: parseInt(form.parcelas, 10) || 1,
        categoria: form.categoria.trim() || "Outros",
        dataCompra: form.dataCompra,
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error ?? "Erro")));
        return res.json();
      })
      .then(() => {
        setForm({ ...form, descricao: "", valor: "" });
        loadCartao();
      })
      .catch((err) => setError(err.message ?? "Erro ao salvar"))
      .finally(() => setSaving(false));
  }

  if (!token) {
    router.push("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader token={token} onLogout={() => { localStorage.removeItem("mendozacontas_token"); setToken(null); }} />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
        </main>
      </div>
    );
  }

  if (!cartao) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader token={token} onLogout={() => { localStorage.removeItem("mendozacontas_token"); setToken(null); }} />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-slate-600">Cartão não encontrado.</p>
          <Link href="/cartoes" className="mt-2 inline-block text-violet-600 hover:underline">
            ← Voltar aos cartões
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader token={token} onLogout={() => { localStorage.removeItem("mendozacontas_token"); setToken(null); }} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/cartoes" className="text-sm text-slate-600 hover:underline">
              ← Cartões
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-slate-800">{cartao.nome}</h1>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Fatura do ciclo atual</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(cartao.faturaAtual)}</p>
            <p className="mt-1 text-xs text-slate-500">
              Ciclo: {cartao.ciclo.start} a {cartao.ciclo.end}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Limite</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(cartao.limite)}</p>
            <p className="mt-1 text-xs text-slate-500">
              Fecha dia {cartao.fechamento} · Vence dia {cartao.vencimento}
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-slate-700">Nova compra</h2>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              <label className="block text-sm text-slate-600">Parcelas</label>
              <input
                type="number"
                min={1}
                max={24}
                value={form.parcelas}
                onChange={(e) => setForm({ ...form, parcelas: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Categoria</label>
              <input
                type="text"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Data da compra</label>
              <input
                type="date"
                value={form.dataCompra}
                onChange={(e) => setForm({ ...form, dataCompra: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Adicionar compra"}
              </button>
            </div>
          </form>
        </div>

        <h2 className="mb-3 text-sm font-medium text-slate-700">Compras do ciclo</h2>
        {cartao.lancamentos.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
            Nenhuma compra neste ciclo.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="p-3 font-medium">Data</th>
                  <th className="p-3 font-medium">Descrição</th>
                  <th className="p-3 font-medium">Categoria</th>
                  <th className="p-3 font-medium">Parcelas</th>
                  <th className="p-3 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {cartao.lancamentos.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3 text-slate-600">{l.dataCompra}</td>
                    <td className="p-3">{l.descricao}</td>
                    <td className="p-3 text-slate-600">{l.categoria}</td>
                    <td className="p-3 text-slate-600">
                      {l.parcelaAtual}/{l.parcelas}
                    </td>
                    <td className="p-3 text-right font-medium text-violet-700">
                      {formatCurrency(l.valor)}
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
