"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Send, X } from "lucide-react";

type Message = { role: "user" | "assistant"; text: string };

const BUBBLE_STORAGE_KEY = "mendozacontas_tanjiro_bubble_closed";

export function ChatPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [bubbleClosed, setBubbleClosed] = useState(false);

  useEffect(() => {
    setToken(typeof window !== "undefined" ? localStorage.getItem("mendozacontas_token") : null);
    setBubbleClosed(typeof window !== "undefined" ? localStorage.getItem(BUBBLE_STORAGE_KEY) === "1" : false);
  }, []);

  function closeBubble() {
    setBubbleClosed(true);
    if (typeof window !== "undefined") localStorage.setItem(BUBBLE_STORAGE_KEY, "1");
  }

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !token || loading) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data.error ?? "Erro ao processar. Tente de novo." },
        ]);
        return;
      }

      setMessages((m) => [...m, { role: "assistant", text: data.reply ?? "Pronto." }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Erro de conexão. Verifique a internet e tente de novo." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!token) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex items-end gap-0">
        {!bubbleClosed && (
          <div className="relative mr-2 flex max-w-[240px] flex-col rounded-2xl rounded-br-sm bg-white py-2.5 pl-3 pr-9 shadow-lg ring-1 ring-slate-200">
            <p className="text-sm leading-snug text-slate-700">
              Miau, vamo ver nossas continhas
              <br />
              pra comprar minha raçãozinha?
            </p>
            <button
              type="button"
              onClick={closeBubble}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Fechar mensagem"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-4 ring-white shadow-lg transition hover:scale-105 hover:shadow-xl"
          aria-label="Abrir chat com Tanjiro"
          title="Miau, vamo ver nossas continhas pra comprar minha raçãozinha?"
        >
          <Image
            src="/tanjiro-avatar.png"
            alt="Tanjiro"
            width={56}
            height={56}
            className="h-14 w-14 object-cover"
          />
        </button>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-0 right-0 z-50 flex h-[85vh] max-h-[600px] w-full max-w-md flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:h-[500px] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="flex items-center gap-2 font-semibold text-slate-800">
                <Image
                  src="/tanjiro-avatar.png"
                  alt="Tanjiro"
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
                />
                Tanjiro
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="px-4 py-2 text-xs text-slate-500">
              Descreva gastos em texto (ex.: &quot;ontem gastei 200 reais pessoal&quot;) e eu registro nas despesas.
            </p>
            <div
              ref={listRef}
              className="relative flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)), url(/tanjiro-chat-bg.png)",
              }}
            >
              {messages.length === 0 && (
                <p className="text-sm text-slate-400">
                  Ex.: &quot;Hoje gastei 50 no Uber e 300 no mercado, conta pessoal&quot;
                </p>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <Image
                      src="/tanjiro-avatar.png"
                      alt=""
                      width={28}
                      height={28}
                      className="mt-1 h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-[var(--primary)] text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <span className="whitespace-pre-wrap">{msg.text}</span>
                    ) : (
                      <div className="space-y-2 leading-relaxed">
                        {msg.text
                          .split(/\n\n+/)
                          .filter((p) => p.trim())
                          .map((para, j) => (
                            <p key={j}>
                              {para
                                .trim()
                                .split("\n")
                                .map((line, k, arr) => (
                                  <span key={k}>
                                    {line}
                                    {k < arr.length - 1 && <br />}
                                  </span>
                                ))}
                            </p>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 justify-start">
                  <Image
                    src="/tanjiro-avatar.png"
                    alt=""
                    width={28}
                    height={28}
                    className="mt-1 h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                  <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
                    Processando…
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} className="border-t border-slate-100 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Descreva os gastos..."
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 px-4 text-sm placeholder-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="rounded-xl bg-[var(--primary)] p-2.5 text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                  aria-label="Enviar"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
