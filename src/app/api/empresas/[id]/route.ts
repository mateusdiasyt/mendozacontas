import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  try {
    const body = await request.json();
    const { nome, ordem } = body as { nome?: string; ordem?: number };

    const existing = await prisma.empresa.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const data: { nome?: string; ordem?: number } = {};
    if (typeof nome === "string") data.nome = nome.trim().slice(0, 100);
    if (typeof ordem === "number") data.ordem = ordem;

    const empresa = await prisma.empresa.update({
      where: { id },
      data,
      select: { id: true, nome: true, ordem: true },
    });

    return NextResponse.json(empresa);
  } catch (e) {
    console.error("Empresas PUT error:", e);
    return NextResponse.json({ error: "Erro ao atualizar empresa" }, { status: 500 });
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

  const existing = await prisma.empresa.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

  try {
    await prisma.empresa.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Empresas DELETE error:", e);
    return NextResponse.json({ error: "Erro ao excluir empresa" }, { status: 500 });
  }
}
