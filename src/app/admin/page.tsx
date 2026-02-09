"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Key, Save, Shield, CheckCircle, Building2, Plus, Pencil, Trash2 } from "lucide-react";

type User = { id: string; email: string; nome: string | null; isAdmin: boolean } | null;
type Empresa = { id: string; nome: string; ordem: number };

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>(null);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [geminiMessage, setGeminiMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [empresaMessage, setEmpresaMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaForm, setEmpresaForm] = useState({ nome: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [savingEmpresa, setSavingEmpresa] = useState(false);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("mendozacontas_token") : null;
    setToken(t);
    const u = typeof window !== "undefined" ? localStorage.getItem("mendozacontas_user") : null;
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.id && data.isAdmin !== undefined) {
          setUser({ id: data.id, email: data.email, nome: data.nome, isAdmin: data.isAdmin });
          localStorage.setItem("mendozacontas_user", JSON.stringify(data));
        }
      })
      .catch(() => setUser(null));
  }, [token]);

  useEffect(() => {
    if (!token || !user?.isAdmin) return;
    fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.geminiConfigured !== undefined) setGeminiConfigured(data.geminiConfigured);
      })
      .catch(() => setGeminiConfigured(false));
  }, [token, user?.isAdmin]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/empresas", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEmpresas(Array.isArray(data) ? data : []))
      .catch(() => setEmpresas([]));
  }, [token]);

  useEffect(() => {
    if (token && user && !user.isAdmin) {
      router.replace("/dashboard");
    }
  }, [token, user, router]);

  function loadEmpresas() {
    if (!token) return;
    fetch("/api/empresas", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEmpresas(Array.isArray(data) ? data : []));
  }

  async function handleEmpresaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !empresaForm.nome.trim()) return;
    setSavingEmpresa(true);
    setEmpresaMessage(null);
    try {
      const res = await fetch("/api/empresas", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome: empresaForm.nome.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmpresaMessage({ type: "error", text: data.error ?? "Erro ao criar empresa" });
        return;
      }
      setEmpresaForm({ nome: "" });
      loadEmpresas();
      setEmpresaMessage({ type: "ok", text: "Empresa adicionada." });
    } catch {
      setEmpresaMessage({ type: "error", text: "Erro de conexão" });
    } finally {
      setSavingEmpresa(false);
    }
  }

  async function handleEmpresaUpdate(id: string) {
    if (!token || !editNome.trim()) return;
    setSavingEmpresa(true);
    setEmpresaMessage(null);
    try {
      const res = await fetch(`/api/empresas/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome: editNome.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmpresaMessage({ type: "error", text: data.error ?? "Erro ao atualizar" });
        return;
      }
      setEditingId(null);
      setEditNome("");
      loadEmpresas();
      setEmpresaMessage({ type: "ok", text: "Empresa atualizada." });
    } catch {
      setEmpresaMessage({ type: "error", text: "Erro de conexão" });
    } finally {
      setSavingEmpresa(false);
    }
  }

  async function handleEmpresaDelete(id: string) {
    if (!token || !confirm("Excluir esta empresa? Lançamentos vinculados continuarão com esse contexto.")) return;
    setSavingEmpresa(true);
    setEmpresaMessage(null);
    try {
      const res = await fetch(`/api/empresas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEmpresaMessage({ type: "error", text: data.error ?? "Erro ao excluir" });
        return;
      }
      setEditingId(null);
      loadEmpresas();
      setEmpresaMessage({ type: "ok", text: "Empresa excluída." });
    } catch {
      setEmpresaMessage({ type: "error", text: "Erro de conexão" });
    } finally {
      setSavingEmpresa(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeminiMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ geminiApiKey: geminiApiKey.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGeminiMessage({ type: "error", text: data.error ?? "Erro ao salvar" });
        return;
      }
      setGeminiConfigured(Boolean(data.geminiConfigured));
      setGeminiMessage({ type: "ok", text: "Configuração salva." });
      setGeminiApiKey("");
    } catch {
      setGeminiMessage({ type: "error", text: "Erro de conexão" });
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <>
        <AppHeader token={null} />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-slate-600">Faça login para acessar o painel admin.</p>
        </main>
      </>
    );
  }

  if (user && !user.isAdmin) {
    return null;
  }

  return (
    <>
      <AppHeader
        token={token}
        user={user}
        onLogout={() => {
          localStorage.removeItem("mendozacontas_token");
          localStorage.removeItem("mendozacontas_user");
          setToken(null);
          setUser(null);
        }}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <Shield className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin</h1>
            <p className="text-sm text-slate-500">Chaves de API e configurações do app</p>
          </div>
        </div>

        <div className="max-w-xl space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Key className="h-5 w-5 text-[var(--primary)]" />
              Google Gemini (IA)
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Chave para o chat com IA que converte texto em despesas. Crie em{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--primary)] hover:underline"
              >
                Google AI Studio
              </a>
              . O app não exibe a chave após salvar.
            </p>
            {geminiConfigured === true && (
              <p className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                Chave configurada
              </p>
            )}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="geminiKey" className="block text-sm font-medium text-slate-700">
                  API Key
                </label>
                <input
                  id="geminiKey"
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder={geminiConfigured ? "Deixe em branco para manter a atual" : "Cole sua chave aqui"}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 py-2.5 px-4 text-slate-900 placeholder-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  autoComplete="off"
                />
              </div>
              {geminiMessage && (
                <p
                  className={
                    geminiMessage.type === "ok"
                      ? "text-sm text-emerald-600"
                      : "text-sm text-red-600"
                  }
                >
                  {geminiMessage.text}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Building2 className="h-5 w-5 text-[var(--primary)]" />
              Empresas (contextos)
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre as empresas ou negócios. Elas aparecem como opções de contexto em despesas, receitas e cartões (em vez de apenas Pessoal/Arcade).
            </p>
            <form onSubmit={handleEmpresaSubmit} className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label htmlFor="empresaNome" className="block text-sm font-medium text-slate-700">
                  Nome da empresa
                </label>
                <input
                  id="empresaNome"
                  type="text"
                  value={empresaForm.nome}
                  onChange={(e) => setEmpresaForm({ nome: e.target.value })}
                  placeholder="Ex: Arcade, Loja, CNPJ X"
                  className="mt-1 w-full rounded-xl border border-slate-200 py-2.5 px-4 text-slate-900 placeholder-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              <button
                type="submit"
                disabled={savingEmpresa || !empresaForm.nome.trim()}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            </form>
            {empresas.length > 0 && (
              <ul className="mt-4 space-y-2">
                {empresas.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 px-4"
                  >
                    {editingId === e.id ? (
                      <>
                        <input
                          type="text"
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          className="flex-1 min-w-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEmpresaUpdate(e.id)}
                            disabled={savingEmpresa}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setEditNome(""); }}
                            className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-300"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-slate-800">{e.nome}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setEditingId(e.id); setEditNome(e.nome); }}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEmpresaDelete(e.id)}
                            disabled={savingEmpresa}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {empresaMessage && (
              <p
                className={`mt-3 text-sm ${empresaMessage.type === "ok" ? "text-emerald-600" : "text-red-600"}`}
              >
                {empresaMessage.text}
              </p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
