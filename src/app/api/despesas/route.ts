import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Contexto, FormaPagamento } from "@prisma/client";

export async function GET(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contexto = searchParams.get("contexto") as Contexto | null;
  const mes = searchParams.get("mes");

  const where: { userId: string; contexto?: Contexto; data?: { gte: Date; lte: Date } } = {
    userId: user.id,
  };
  if (contexto === "PESSOAL" || contexto === "ARCADE") where.contexto = contexto;
  if (mes) {
    const [y, m] = mes.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m - 1 + 1, 0);
    where.data = { gte: start, lte: end };
  }

  const list = await prisma.despesa.findMany({
    where,
    orderBy: { data: "desc" },
    take: 200,
  });

  return NextResponse.json(
    list.map((d) => ({
      id: d.id,
      descricao: d.descricao,
      valor: Number(d.valor),
      categoria: d.categoria,
      data: d.data.toISOString().slice(0, 10),
      formaPagamento: d.formaPagamento,
      contexto: d.contexto,
      recorrente: d.recorrente,
    }))
  );
}

export async function POST(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { descricao, valor, categoria, data, formaPagamento, contexto, recorrente } = body as {
      descricao?: string;
      valor?: number;
      categoria?: string;
      data?: string;
      formaPagamento?: FormaPagamento;
      contexto?: Contexto;
      recorrente?: boolean;
    };

    if (!descricao?.trim() || valor == null || !categoria?.trim() || !data?.trim()) {
      return NextResponse.json(
        { error: "Descrição, valor, categoria e data são obrigatórios" },
        { status: 400 }
      );
    }
    if (!["PIX", "DINHEIRO", "CARTAO"].includes(formaPagamento ?? "")) {
      return NextResponse.json({ error: "Forma de pagamento inválida" }, { status: 400 });
    }
    if (contexto !== "PESSOAL" && contexto !== "ARCADE") {
      return NextResponse.json({ error: "Contexto deve ser PESSOAL ou ARCADE" }, { status: 400 });
    }

    const despesa = await prisma.despesa.create({
      data: {
        userId: user.id,
        descricao: descricao.trim(),
        valor: Number(valor),
        categoria: categoria.trim(),
        data: new Date(data),
        formaPagamento: formaPagamento as FormaPagamento,
        contexto,
        recorrente: Boolean(recorrente),
      },
    });

    return NextResponse.json({
      id: despesa.id,
      descricao: despesa.descricao,
      valor: Number(despesa.valor),
      categoria: despesa.categoria,
      data: despesa.data.toISOString().slice(0, 10),
      formaPagamento: despesa.formaPagamento,
      contexto: despesa.contexto,
      recorrente: despesa.recorrente,
    });
  } catch (e) {
    console.error("Despesas POST error:", e);
    return NextResponse.json({ error: "Erro ao criar despesa" }, { status: 500 });
  }
}
