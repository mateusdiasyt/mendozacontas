"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nome: nome || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar conta");
        return;
      }
      if (data.token) {
        localStorage.setItem("mendozacontas_token", data.token);
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-app px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-2xl font-bold text-white shadow-glow"
          >
            M
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Criar conta
          </h1>
          <p className="mt-1 text-sm text-slate-500">MendozaContas</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-card">
          <h2 className="text-lg font-semibold text-slate-900">Cadastro</h2>
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-slate-700">
                Nome (opcional)
              </label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="Seu nome"
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                E-mail
              </label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Senha
              </label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 font-medium text-white shadow-sm transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {loading ? "Criando…" : "Criar conta"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
