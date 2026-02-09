import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos" },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos" },
        { status: 401 }
      );
    }

    const token = await createToken(user.id, user.email);
    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, nome: user.nome },
    });
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json(
      { error: "Erro ao fazer login" },
      { status: 500 }
    );
  }
}
