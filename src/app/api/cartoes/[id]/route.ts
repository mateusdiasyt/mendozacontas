import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCicloFatura } from "@/lib/cartao";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const cartao = await prisma.cartao.findFirst({
    where: { id, userId: user.id },
  });
  if (!cartao) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

  const { start, end } = getCicloFatura(cartao.fechamento, new Date());

  const lancamentosCiclo = await prisma.lancamentoCartao.findMany({
    where: {
      cartaoId: id,
      dataCompra: { gte: start, lte: end },
    },
    orderBy: { dataCompra: "desc" },
  });

  const faturaCiclo = lancamentosCiclo.reduce((s, l) => s + Number(l.valor), 0);

  return NextResponse.json({
    id: cartao.id,
    nome: cartao.nome,
    limite: Number(cartao.limite),
    fechamento: cartao.fechamento,
    vencimento: cartao.vencimento,
    contexto: cartao.contexto,
    ciclo: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
    faturaAtual: faturaCiclo,
    lancamentos: lancamentosCiclo.map((l) => ({
      id: l.id,
      descricao: l.descricao,
      valor: Number(l.valor),
      parcelas: l.parcelas,
      parcelaAtual: l.parcelaAtual,
      categoria: l.categoria,
      dataCompra: l.dataCompra.toISOString().slice(0, 10),
    })),
  });
}
