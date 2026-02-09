import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Contexto, FormaPagamento } from "@prisma/client";
import { startOfMonth, endOfMonth } from "date-fns";

const GEMINI_KEY = "gemini_api_key";
const MODEL = "gemini-2.0-flash";

const SYSTEM_PROMPT = `Você é um assistente financeiro do MendozaContas. Você pode fazer DUAS coisas:

1) REGISTRAR DESPESAS: Se o usuário descrever gastos ou receitas em texto (ex.: "ontem gastei 200 reais pessoal", "pagamos o Pedro 91 do Arcade"), extraia cada item e coloque no array "expenses". Cada objeto no array:
- "tipo": "despesa" ou "receita"
- "descricao": string curta
- "valor": número positivo
- "data": "YYYY-MM-DD" (hoje/ontem conforme as datas fornecidas)
- "contexto": "PESSOAL" ou "ARCADE"
- "categoria": string em português (ex.: "Alimentação", "Outros")
- "formaPagamento": "PIX" ou "DINHEIRO" ou "CARTAO"
Se não houver nenhum gasto/receita na mensagem, use "expenses": [].

2) RESPONDER PERGUNTAS: Você receberá um bloco "Dados financeiros do usuário" com números atuais (saldo, status, quanto gastou no mês, extra necessário para sair do negativo, etc.). Se o usuário perguntar coisas como "quanto gastei no mês?", "quanto falta pra sair do crítico?", "qual meu saldo?", "quanto posso gastar?", responda em português de forma clara e breve usando ESSES dados. Coloque a resposta no campo "reply".

SEMPRE responda com um ÚNICO JSON válido, sem texto antes ou depois, neste formato:
{"expenses": [ array de despesas/receitas ou vazio ], "reply": "sua resposta em português"}

- Se o usuário só registrou despesas: reply pode ser um resumo do que foi registrado.
- Se o usuário só fez pergunta: use os dados financeiros para responder em "reply"; expenses = [].
- Se fez os dois: preencha expenses e reply.`;

function parseGeminiResponse(text: string): {
  expenses: Array<{
    tipo: string;
    descricao: string;
    valor: number;
    data: string;
    contexto: string;
    categoria: string;
    formaPagamento: string;
  }>;
  reply: string;
} {
  const trimmed = text.trim();
  let jsonStr = trimmed;
  const codeMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1].trim();
  const parsed = JSON.parse(jsonStr) as unknown;
  if (!parsed || typeof parsed !== "object" || !("reply" in parsed)) {
    return { expenses: [], reply: "Não consegui processar. Tente de novo." };
  }
  const obj = parsed as { expenses?: unknown; reply?: string };
  const reply = typeof obj.reply === "string" ? obj.reply : "Pronto.";
  const arr = Array.isArray(obj.expenses) ? obj.expenses : [];
  const expenses = arr.filter(
    (x): x is { tipo: string; descricao: string; valor: number; data: string; contexto: string; categoria: string; formaPagamento: string } =>
      x && typeof x === "object" && (x.tipo === "despesa" || x.tipo === "receita") && typeof x.valor === "number" && typeof x.descricao === "string" && typeof x.data === "string"
  );
  return { expenses, reply };
}

export async function POST(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const setting = await prisma.setting.findUnique({ where: { key: GEMINI_KEY } });
  const apiKey = setting?.value?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chave do Gemini não configurada. Um admin precisa configurar em Admin." },
      { status: 400 }
    );
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Envie uma mensagem" }, { status: 400 });
  }

  const now = new Date();
  const inicioMes = startOfMonth(now);
  const fimMes = endOfMonth(now);
  const [receitasPessoal, despesasPessoal] = await Promise.all([
    prisma.receita.aggregate({
      where: { userId: user.id, contexto: "PESSOAL", data: { gte: inicioMes, lte: fimMes } },
      _sum: { valor: true },
    }),
    prisma.despesa.aggregate({
      where: { userId: user.id, contexto: "PESSOAL", data: { gte: inicioMes, lte: fimMes } },
      _sum: { valor: true },
    }),
  ]);
  const toNum = (v: unknown) => (v != null ? Number(v) : 0);
  const totalReceitasPessoal = toNum(receitasPessoal._sum?.valor);
  const totalDespesasPessoal = toNum(despesasPessoal._sum?.valor);
  const saldoPessoalAtual = totalReceitasPessoal - totalDespesasPessoal;
  const projecaoFechamentoPessoal = saldoPessoalAtual;
  let status: "OK" | "ATENCAO" | "CRITICO" = "OK";
  if (projecaoFechamentoPessoal < 0) status = "CRITICO";
  else if (projecaoFechamentoPessoal < totalDespesasPessoal * 0.2) status = "ATENCAO";
  const extraNecessario = projecaoFechamentoPessoal >= 0 ? 0 : Math.abs(projecaoFechamentoPessoal);

  const todayStr = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const contextBlock = `Dados financeiros do usuário (mês atual, conta pessoal):
- Saldo pessoal no mês (receitas - despesas): R$ ${saldoPessoalAtual.toFixed(2)}
- Total de receitas no mês: R$ ${totalReceitasPessoal.toFixed(2)}
- Total de despesas no mês (quanto já gastou): R$ ${totalDespesasPessoal.toFixed(2)}
- Status: ${status} (OK = tranquilo, ATENCAO = cuidado, CRITICO = no negativo)
- Extra necessário para sair do negativo / fechar no azul: R$ ${extraNecessario.toFixed(2)}
- Projeção de fechamento do mês: R$ ${projecaoFechamentoPessoal.toFixed(2)}`;

  const userPrompt = `Datas: hoje = ${todayStr}, ontem = ${yesterdayStr}.

${contextBlock}

Mensagem do usuário:
${message}`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
        },
      }),
    }
  );

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    console.error("Gemini API error:", geminiRes.status, errText);
    return NextResponse.json(
      { error: "Erro ao falar com a IA. Verifique a chave no Admin ou tente de novo." },
      { status: 502 }
    );
  }

  const geminiJson = await geminiRes.json();
  const text =
    geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ??
    geminiJson?.candidates?.[0]?.content?.parts?.[0]?.inlineData ??
    "";
  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "Resposta da IA inesperada. Tente reformular a mensagem." },
      { status: 502 }
    );
  }

  let parsed: { expenses: Array<{ tipo: string; descricao: string; valor: number; data: string; contexto: string; categoria: string; formaPagamento: string }>; reply: string };
  try {
    parsed = parseGeminiResponse(text);
  } catch (e) {
    console.error("Parse Gemini JSON error:", e);
    return NextResponse.json(
      { error: "A IA não retornou dados válidos. Tente descrever de outra forma." },
      { status: 502 }
    );
  }

  const { expenses: items, reply: aiReply } = parsed;
  const created: Array<{ tipo: string; descricao: string; valor: number; data: string; contexto: string }> = [];
  const errors: string[] = [];

  for (const item of items) {
    const contexto = (item.contexto?.toUpperCase() === "ARCADE" ? "ARCADE" : "PESSOAL") as Contexto;
    const formaPagamento = (["PIX", "DINHEIRO", "CARTAO"].includes(item.formaPagamento?.toUpperCase() ?? "")
      ? item.formaPagamento.toUpperCase()
      : "PIX") as FormaPagamento;
    const valor = Number(item.valor);
    const dataStr = item.data?.slice(0, 10) || todayStr;
    const descricao = String(item.descricao || "Sem descrição").slice(0, 500);
    const categoria = String(item.categoria || "Outros").slice(0, 100);

    if (item.tipo === "receita") {
      // Por enquanto só criamos despesas; receita pode ser adicionada depois
      continue;
    }

    try {
      await prisma.despesa.create({
        data: {
          userId: user.id,
          descricao,
          valor,
          categoria,
          data: new Date(dataStr),
          formaPagamento,
          contexto,
          recorrente: false,
        },
      });
      created.push({
        tipo: "despesa",
        descricao,
        valor,
        data: dataStr,
        contexto,
      });
    } catch (e) {
      console.error("Create despesa error:", e);
      errors.push(`${descricao}: erro ao salvar`);
    }
  }

  const reply =
    errors.length > 0
      ? aiReply + "\n\nAlguns itens não puderam ser salvos: " + errors.join("; ")
      : aiReply;

  return NextResponse.json({
    reply,
    created: created.length,
    items: created,
  });
}
