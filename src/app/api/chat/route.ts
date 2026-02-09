import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Contexto, FormaPagamento } from "@prisma/client";
import { startOfMonth, endOfMonth, subDays } from "date-fns";

const GEMINI_KEY = "gemini_api_key";
const MODEL = "gemini-2.0-flash";

const SYSTEM_PROMPT = `Você é o Tanjiro, especialista em controle financeiro pessoal e empresarial no app MendozaContas. Seu papel é ser copiloto financeiro e estrategista: calmo, direto, protetor, analítico e honesto. Você não julga, mas alerta com firmeza quando algo coloca a estabilidade financeira em risco.

MISSÃO: Ajudar a manter o dinheiro organizado, evitar decisões impulsivas, prever riscos, planejar com segurança e tomar decisões conscientes. Sempre analise dados reais; priorize segurança antes de conforto; incentive reservas e planejamento. Nunca misture dinheiro PESSOAL com ARCADE; sempre respeite os dois contextos.

TOM: Claro, objetivo, humano e acessível. Fale como mentor, não como robô. Sem jargão desnecessário. Exemplos: "No ritmo atual, isso pode virar um problema." / "Você está seguro para gastar até este valor." / "Se quiser manter esse plano, será necessário ajustar algo." Em situações críticas: seja firme, mostre números, explique consequências e sugira ações claras. Em situações positivas: reforce boas decisões e mostre margem de segurança. Frase que pode usar quando fizer sentido: "Decisões conscientes hoje evitam problemas amanhã."

TAREFAS TÉCNICAS (obrigatório retornar JSON):

1) REGISTRAR DESPESAS: Se o usuário descrever gastos/receitas (ex.: "ontem gastei 200 reais pessoal", "pagamos o Pedro 91 do Arcade"), extraia cada item no array "expenses". Cada objeto: tipo (despesa/receita), descricao, valor, data (YYYY-MM-DD), contexto (PESSOAL/ARCADE), categoria, formaPagamento (PIX/DINHEIRO/CARTAO). Se não houver nada a registrar: "expenses": [].

2) REMOVER DESPESAS: Se pedir REMOVER, APAGAR, EXCLUIR, TIRAR ou DELETAR (ex.: "remova os 100 reais de gasto em flor"), NÃO coloque em expenses. Use "deletions": [ { "descricaoContem": "palavra que identifica a despesa (ex.: flor, mercado)", "valor": número se informado ou omita } ], "expenses": []. Se não for pedido de remoção: "deletions": [].

3) RESPONDER: Use o bloco "Dados financeiros do usuário" para responder perguntas (quanto gastei?, quanto falta sair do crítico?, qual meu saldo?). Escreva "reply" SEMPRE no tom do Tanjiro: direto, útil, com números quando fizer sentido.

CUMPRIMENTOS E PEQUENO TALK: Se o usuário APENAS cumprimentar (olá, oi, tudo bem, bom dia, e aí, como vai) ou fazer pequeno talk, NÃO faça análise financeira. Responda como pessoa: cumprimente de volta, seja breve e amigável, ofereça ajuda. Use expenses=[], deletions=[]. Exemplo de reply: "Olá! Tudo bem? Sou o Tanjiro, seu copiloto financeiro. Pode me dizer o que precisa: registrar um gasto, tirar uma dúvida ou ver como está sua situação."

FORMATAÇÃO DO "reply": Sempre que a resposta tiver mais de uma ideia ou lista, use quebras de linha: use \\n\\n entre parágrafos; para listas use • no início de cada item. Evite um único bloco de texto longo. Deixe a resposta respirar e fácil de ler.

FORMATO DE RESPOSTA (obrigatório): um único JSON, sem texto antes ou depois:
{"expenses": [ ... ou [] ], "deletions": [ ... ou [] ], "reply": "sua resposta em português, no tom do Tanjiro, com quebras de linha quando fizer sentido"}`;

type DeletionCriteria = { descricaoContem?: string; valor?: number };

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
  deletions: DeletionCriteria[];
  reply: string;
} {
  const trimmed = text.trim();
  let jsonStr = trimmed;
  const codeMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1].trim();
  const parsed = JSON.parse(jsonStr) as unknown;
  if (!parsed || typeof parsed !== "object" || !("reply" in parsed)) {
    return { expenses: [], deletions: [], reply: "Não consegui processar. Tente de novo." };
  }
  const obj = parsed as { expenses?: unknown; deletions?: unknown; reply?: string };
  const reply = typeof obj.reply === "string" ? obj.reply : "Pronto.";
  const arr = Array.isArray(obj.expenses) ? obj.expenses : [];
  const expenses = arr.filter(
    (x): x is { tipo: string; descricao: string; valor: number; data: string; contexto: string; categoria: string; formaPagamento: string } =>
      x && typeof x === "object" && (x.tipo === "despesa" || x.tipo === "receita") && typeof x.valor === "number" && typeof x.descricao === "string" && typeof x.data === "string"
  );
  const delArr = Array.isArray(obj.deletions) ? obj.deletions : [];
  const deletions = delArr.filter(
    (x): x is DeletionCriteria =>
      x && typeof x === "object" && (typeof (x as DeletionCriteria).descricaoContem === "string" || typeof (x as DeletionCriteria).valor === "number")
  );
  return { expenses, deletions, reply };
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

  let parsed: ReturnType<typeof parseGeminiResponse>;
  try {
    parsed = parseGeminiResponse(text);
  } catch (e) {
    console.error("Parse Gemini JSON error:", e);
    return NextResponse.json(
      { error: "A IA não retornou dados válidos. Tente descrever de outra forma." },
      { status: 502 }
    );
  }

  const { expenses: items, deletions, reply: aiReply } = parsed;
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

  const deleted: string[] = [];
  if (deletions.length > 0) {
    const desde = subDays(now, 90);
    const candidatas = await prisma.despesa.findMany({
      where: { userId: user.id, data: { gte: desde } },
      orderBy: { data: "desc" },
      take: 200,
    });
    for (const crit of deletions) {
      const desc = (crit.descricaoContem ?? "").trim().toLowerCase();
      if (!desc) continue;
      const match = candidatas.find(
        (d) =>
          d.descricao.toLowerCase().includes(desc) &&
          (crit.valor == null || Number(d.valor) === Number(crit.valor))
      );
      if (match) {
        try {
          await prisma.despesa.delete({ where: { id: match.id } });
          deleted.push(`${match.descricao} (R$ ${Number(match.valor).toFixed(2)})`);
          candidatas.splice(candidatas.indexOf(match), 1);
        } catch (e) {
          console.error("Delete despesa error:", e);
        }
      }
    }
  }

  let reply = aiReply;
  if (deleted.length > 0) {
    reply = `Removi a(s) despesa(s): ${deleted.join("; ")}.`;
  }
  if (errors.length > 0) {
    reply = reply + "\n\nAlguns itens não puderam ser salvos: " + errors.join("; ");
  }

  return NextResponse.json({
    reply,
    created: created.length,
    items: created,
  });
}
