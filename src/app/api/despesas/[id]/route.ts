import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PESSOAL_ID } from "@/lib/contexto";
import type { FormaPagamento } from "@prisma/client";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const existing = await prisma.despesa.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });

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

    const despesa = await prisma.despesa.update({
      where: { id },
      data: {
        descricao: descricao.trim(),
        valor: Number(valor),
        categoria: categoria.trim(),
        data: new Date(data),
        formaPagamento: formaPagamento as FormaPagamento,
        contexto: contexto!,
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
    console.error("Despesas PUT error:", e);
    return NextResponse.json({ error: "Erro ao atualizar despesa" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const existing = await prisma.despesa.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });

  try {
    await prisma.despesa.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Despesas DELETE error:", e);
    return NextResponse.json({ error: "Erro ao excluir despesa" }, { status: 500 });
  }
}
