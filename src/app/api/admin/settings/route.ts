import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const GEMINI_KEY = "gemini_api_key";

export async function GET(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const setting = await prisma.setting.findUnique({
    where: { key: GEMINI_KEY },
  });

  // Não devolver a chave em texto; só indicar se está configurada
  return NextResponse.json({
    geminiConfigured: Boolean(setting?.value?.trim()),
  });
}

export async function PUT(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body = await request.json();
    const { geminiApiKey } = body as { geminiApiKey?: string };

    const value = typeof geminiApiKey === "string" ? geminiApiKey.trim() : "";

    await prisma.setting.upsert({
      where: { key: GEMINI_KEY },
      create: { key: GEMINI_KEY, value },
      update: { value },
    });

    return NextResponse.json({
      ok: true,
      geminiConfigured: Boolean(value),
    });
  } catch (e) {
    console.error("Admin settings PUT error:", e);
    return NextResponse.json({ error: "Erro ao salvar configuração" }, { status: 500 });
  }
}
