import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PESSOAL_ID } from "@/lib/contexto";
import type { FormaPagamento } from "@prisma/client";

export async function GET(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contexto = searchParams.get("contexto");
  const mes = searchParams.get("mes");

  const where: { userId: string; contexto?: string; data?: { gte: Date; lte: Date } } = {
    userId: user.id,
  };
  if (contexto === PESSOAL_ID || (contexto && contexto.length > 0)) where.contexto = contexto;
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
      parcelas: d.parcelas,
      parcelaAtual: d.parcelaAtual,
    }))
  );
}

export async function POST(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { descricao, valor, categoria, data, formaPagamento, contexto, recorrente, parcelas, parcelaAtual } = body as {
      descricao?: string;
      valor?: number;
      categoria?: string;
      data?: string;
      formaPagamento?: FormaPagamento;
      contexto?: string;
      recorrente?: boolean;
      parcelas?: number;
      parcelaAtual?: number;
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
    const contextoValido =
      contexto === PESSOAL_ID ||
      (contexto &&
        (await prisma.empresa.findFirst({ where: { id: contexto, userId: user.id } })));
    if (!contextoValido) {
      return NextResponse.json(
        { error: "Contexto deve ser Pessoal ou uma empresa cadastrada" },
        { status: 400 }
      );
    }

    const parcelasNum = Math.max(1, Math.min(99, Number(parcelas) || 1));
    const parcelaAtualNum = Math.max(1, Math.min(parcelasNum, Number(parcelaAtual) || 1));

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
        parcelas: parcelasNum,
        parcelaAtual: parcelaAtualNum,
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
      parcelas: despesa.parcelas,
      parcelaAtual: despesa.parcelaAtual,
    });
  } catch (e) {
    console.error("Despesas POST error:", e);
    return NextResponse.json({ error: "Erro ao criar despesa" }, { status: 500 });
  }
}
