import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST: Faz repasse Empresa → Pessoal.
 * Cria 1 Repasse + 1 Despesa (contexto = empresa) + 1 Receita (PESSOAL, tipo REPASSE).
 */
export async function POST(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { valor, data, contextoOrigem } = body as {
      valor?: number;
      data?: string;
      contextoOrigem?: string;
    };

    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      return NextResponse.json({ error: "Valor deve ser maior que zero" }, { status: 400 });
    }

    // De qual empresa sai o repasse (obrigatório ser uma empresa do usuário)
    const empresa =
      contextoOrigem &&
      (await prisma.empresa.findFirst({ where: { id: contextoOrigem, userId: user.id } }));
    if (!empresa) {
      return NextResponse.json(
        { error: "Selecione a empresa de origem do repasse" },
        { status: 400 }
      );
    }

    const dataRepasse = data ? new Date(data) : new Date();
    const dataStr = dataRepasse.toISOString().slice(0, 10);

    const repasse = await prisma.$transaction(async (tx) => {
      const r = await tx.repasse.create({
        data: {
          userId: user.id,
          valor: valorNum,
          data: dataRepasse,
        },
      });

      const [receita, despesa] = await Promise.all([
        tx.receita.create({
          data: {
            userId: user.id,
            descricao: `Repasse ${empresa.nome} (${dataStr})`,
            valor: valorNum,
            data: dataRepasse,
            tipo: "REPASSE",
            contexto: "PESSOAL",
            repasseId: r.id,
          },
        }),
        tx.despesa.create({
          data: {
            userId: user.id,
            descricao: `Repasse para pessoal (${dataStr})`,
            valor: valorNum,
            categoria: "Repasse",
            data: dataRepasse,
            formaPagamento: "PIX",
            contexto: empresa.id,
            recorrente: false,
            repasseId: r.id,
          },
        }),
      ]);

      return { repasse: r, receita, despesa };
    });

    return NextResponse.json({
      id: repasse.repasse.id,
      valor: Number(repasse.repasse.valor),
      data: repasse.repasse.data.toISOString().slice(0, 10),
    });
  } catch (e) {
    console.error("Repasse POST error:", e);
    return NextResponse.json({ error: "Erro ao realizar repasse" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const list = await prisma.repasse.findMany({
    where: { userId: user.id },
    orderBy: { data: "desc" },
    take: 50,
  });

  return NextResponse.json(
    list.map((r) => ({
      id: r.id,
      valor: Number(r.valor),
      data: r.data.toISOString().slice(0, 10),
    }))
  );
}
