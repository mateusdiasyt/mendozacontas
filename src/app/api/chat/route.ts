import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Contexto, FormaPagamento } from "@prisma/client";

const GEMINI_KEY = "gemini_api_key";
const MODEL = "gemini-1.5-flash";

const SYSTEM_PROMPT = `Você é um assistente financeiro. O usuário vai escrever em português sobre gastos ou receitas (ex.: "ontem gastei 200 reais pessoal", "pagamos o Pedro 91 do Arcade").
Sua tarefa: extrair cada despesa ou receita e responder SOMENTE com um JSON válido, sem texto antes ou depois.
Formato do JSON: um array de objetos. Cada objeto:
- "tipo": "despesa" ou "receita"
- "descricao": string curta (ex.: "Gasto pessoal", "Pagamento Pedro - funcionário")
- "valor": número (sempre positivo)
- "data": "YYYY-MM-DD" (hoje = data de hoje, ontem = ontem; se não der para saber use hoje)
- "contexto": "PESSOAL" ou "ARCADE" (conta pessoal, pessoal, meu = PESSOAL; arcade, negócio, funcionário arcade = ARCADE)
- "categoria": string em português (ex.: "Alimentação", "Transporte", "Folha de pagamento", "Outros")
- "formaPagamento": "PIX" ou "DINHEIRO" ou "CARTAO" (se não der para saber use "PIX")

Regras: valor em reais; uma frase pode gerar vários itens; se não houver nenhum gasto/receita identificável, retorne []. Responda apenas o JSON, nada mais.`;

function parseGeminiText(text: string): Array<{
  tipo: string;
  descricao: string;
  valor: number;
  data: string;
  contexto: string;
  categoria: string;
  formaPagamento: string;
}> {
  const trimmed = text.trim();
  let jsonStr = trimmed;
  const codeMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1].trim();
  const parsed = JSON.parse(jsonStr) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (x): x is { tipo: string; descricao: string; valor: number; data: string; contexto: string; categoria: string; formaPagamento: string } =>
      x && typeof x === "object" && (x.tipo === "despesa" || x.tipo === "receita") && typeof x.valor === "number" && typeof x.descricao === "string" && typeof x.data === "string"
  );
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

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const userPrompt = `Data de hoje: ${todayStr}. Ontem: ${yesterdayStr}.\n\nMensagem do usuário:\n${message}`;

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

  let items: Array<{
    tipo: string;
    descricao: string;
    valor: number;
    data: string;
    contexto: string;
    categoria: string;
    formaPagamento: string;
  }>;
  try {
    items = parseGeminiText(text);
  } catch (e) {
    console.error("Parse Gemini JSON error:", e);
    return NextResponse.json(
      { error: "A IA não retornou dados válidos. Tente descrever de outra forma." },
      { status: 502 }
    );
  }

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
    created.length === 0 && errors.length === 0
      ? "Não identifiquei nenhuma despesa na sua mensagem. Escreva algo como: \"Ontem gastei 200 reais no mercado, conta pessoal\" ou \"Pagamos o Pedro 91 reais do Arcade\"."
      : created.length > 0
        ? `Registrei ${created.length} despesa(s):\n${created.map((c) => `• ${c.descricao} — R$ ${c.valor.toFixed(2)} (${c.contexto}, ${c.data})`).join("\n")}`
        : "";

  if (errors.length > 0) {
    return NextResponse.json({
      reply: reply + (reply ? "\n\n" : "") + "Alguns itens não puderam ser salvos: " + errors.join("; "),
      created: created.length,
      items: created,
    });
  }

  return NextResponse.json({
    reply,
    created: created.length,
    items: created,
  });
}
