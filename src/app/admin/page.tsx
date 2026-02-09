"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Key, Save, Shield, CheckCircle } from "lucide-react";

type User = { id: string; email: string; nome: string | null; isAdmin: boolean } | null;

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>(null);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

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
    if (token && user && !user.isAdmin) {
      router.replace("/dashboard");
    }
  }, [token, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
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
        setMessage({ type: "error", text: data.error ?? "Erro ao salvar" });
        return;
      }
      setGeminiConfigured(Boolean(data.geminiConfigured));
      setMessage({ type: "ok", text: "Configuração salva." });
      setGeminiApiKey("");
    } catch {
      setMessage({ type: "error", text: "Erro de conexão" });
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
              {message && (
                <p
                  className={
                    message.type === "ok"
                      ? "text-sm text-emerald-600"
                      : "text-sm text-red-600"
                  }
                >
                  {message.text}
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
        </div>
      </main>
    </>
  );
}
