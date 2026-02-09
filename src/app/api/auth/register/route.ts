import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, nome } = body as { email?: string; password?: string; nome?: string };

    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma conta com este e-mail" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        nome: nome?.trim() || null,
      },
    });

    const token = await createToken(user.id, user.email);
    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, nome: user.nome },
    });
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json(
      { error: "Erro ao criar conta" },
      { status: 500 }
    );
  }
}
