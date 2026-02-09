import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PESSOAL_ID } from "@/lib/contexto";
import type { TipoReceita } from "@prisma/client";

export async function GET(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contexto = searchParams.get("contexto");
  const mes = searchParams.get("mes"); // YYYY-MM

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

  const list = await prisma.receita.findMany({
    where,
    orderBy: { data: "desc" },
    take: 200,
  });

  return NextResponse.json(
    list.map((r) => ({
      id: r.id,
      descricao: r.descricao,
      valor: Number(r.valor),
      data: r.data.toISOString().slice(0, 10),
      tipo: r.tipo,
      contexto: r.contexto,
      observacao: r.observacao,
    }))
  );
}

export async function POST(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { descricao, valor, data, tipo, contexto, observacao } = body as {
      descricao?: string;
      valor?: number;
      data?: string;
      tipo?: TipoReceita;
      contexto?: string;
      observacao?: string;
    };

    if (!descricao?.trim() || valor == null || !data?.trim()) {
      return NextResponse.json(
        { error: "Descrição, valor e data são obrigatórios" },
        { status: 400 }
      );
    }
    if (!["FIXA", "EXTRA", "ARCADE_DIARIA", "REPASSE"].includes(tipo ?? "")) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
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

    const receita = await prisma.receita.create({
      data: {
        userId: user.id,
        descricao: descricao.trim(),
        valor: Number(valor),
        data: new Date(data),
        tipo: tipo as TipoReceita,
        contexto,
        observacao: observacao?.trim() || null,
      },
    });

    return NextResponse.json({
      id: receita.id,
      descricao: receita.descricao,
      valor: Number(receita.valor),
      data: receita.data.toISOString().slice(0, 10),
      tipo: receita.tipo,
      contexto: receita.contexto,
      observacao: receita.observacao,
    });
  } catch (e) {
    console.error("Receitas POST error:", e);
    return NextResponse.json({ error: "Erro ao criar receita" }, { status: 500 });
  }
}
