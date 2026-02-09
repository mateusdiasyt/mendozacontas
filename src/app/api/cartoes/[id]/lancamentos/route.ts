import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: cartaoId } = await params;
  const cartao = await prisma.cartao.findFirst({
    where: { id: cartaoId, userId: user.id },
  });
  if (!cartao) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

  try {
    const body = await request.json();
    const { descricao, valor, parcelas, categoria, dataCompra } = body as {
      descricao?: string;
      valor?: number;
      parcelas?: number;
      categoria?: string;
      dataCompra?: string;
    };

    if (!descricao?.trim() || valor == null) {
      return NextResponse.json(
        { error: "Descrição e valor são obrigatórios" },
        { status: 400 }
      );
    }
    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }
    const parcelasNum = Math.max(1, Math.min(24, Number(parcelas) || 1));
    const data = dataCompra ? new Date(dataCompra) : new Date();

    const lancamento = await prisma.lancamentoCartao.create({
      data: {
        userId: user.id,
        cartaoId,
        descricao: descricao.trim(),
        valor: valorNum,
        parcelas: parcelasNum,
        parcelaAtual: 1,
        categoria: (categoria ?? "").trim() || "Outros",
        dataCompra: data,
        contexto: cartao.contexto,
      },
    });

    return NextResponse.json({
      id: lancamento.id,
      descricao: lancamento.descricao,
      valor: Number(lancamento.valor),
      parcelas: lancamento.parcelas,
      parcelaAtual: lancamento.parcelaAtual,
      categoria: lancamento.categoria,
      dataCompra: lancamento.dataCompra.toISOString().slice(0, 10),
    });
  } catch (e) {
    console.error("Lancamentos POST error:", e);
    return NextResponse.json({ error: "Erro ao adicionar compra" }, { status: 500 });
  }
}
