import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const empresas = await prisma.empresa.findMany({
    where: { userId: user.id },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: { id: true, nome: true, ordem: true },
  });

  return NextResponse.json(empresas);
}

export async function POST(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { nome, ordem } = body as { nome?: string; ordem?: number };
    const nomeTrim = typeof nome === "string" ? nome.trim() : "";
    if (!nomeTrim) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

    const empresa = await prisma.empresa.create({
      data: {
        nome: nomeTrim.slice(0, 100),
        ordem: typeof ordem === "number" ? ordem : 0,
        userId: user.id,
      },
      select: { id: true, nome: true, ordem: true },
    });

    return NextResponse.json(empresa);
  } catch (e) {
    console.error("Empresas POST error:", e);
    return NextResponse.json({ error: "Erro ao criar empresa" }, { status: 500 });
  }
}
