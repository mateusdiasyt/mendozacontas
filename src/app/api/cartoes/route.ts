import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Contexto } from "@prisma/client";

export async function GET(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contexto = searchParams.get("contexto") as Contexto | null;

  const where: { userId: string; contexto?: Contexto } = { userId: user.id };
  if (contexto === "PESSOAL" || contexto === "ARCADE") where.contexto = contexto;

  const cartoes = await prisma.cartao.findMany({
    where,
    orderBy: { nome: "asc" },
    include: { _count: { select: { lancamentos: true } } },
  });

  return NextResponse.json(
    cartoes.map((c) => ({
      id: c.id,
      nome: c.nome,
      limite: Number(c.limite),
      fechamento: c.fechamento,
      vencimento: c.vencimento,
      contexto: c.contexto,
      totalLancamentos: c._count.lancamentos,
    }))
  );
}

export async function POST(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { nome, limite, fechamento, vencimento, contexto } = body as {
      nome?: string;
      limite?: number;
      fechamento?: number;
      vencimento?: number;
      contexto?: Contexto;
    };

    if (!nome?.trim()) {
      return NextResponse.json({ error: "Nome do cartão é obrigatório" }, { status: 400 });
    }
    if (limite == null || Number(limite) < 0) {
      return NextResponse.json({ error: "Limite inválido" }, { status: 400 });
    }
    const fech = Math.min(31, Math.max(1, Number(fechamento) || 1));
    const venc = Math.min(31, Math.max(1, Number(vencimento) || 1));
    if (contexto !== "PESSOAL" && contexto !== "ARCADE") {
      return NextResponse.json({ error: "Contexto deve ser PESSOAL ou ARCADE" }, { status: 400 });
    }

    const cartao = await prisma.cartao.create({
      data: {
        userId: user.id,
        nome: nome.trim(),
        limite: Number(limite),
        fechamento: fech,
        vencimento: venc,
        contexto,
      },
    });

    return NextResponse.json({
      id: cartao.id,
      nome: cartao.nome,
      limite: Number(cartao.limite),
      fechamento: cartao.fechamento,
      vencimento: cartao.vencimento,
      contexto: cartao.contexto,
    });
  } catch (e) {
    console.error("Cartões POST error:", e);
    return NextResponse.json({ error: "Erro ao criar cartão" }, { status: 500 });
  }
}
