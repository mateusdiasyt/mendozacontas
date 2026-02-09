import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    nome: user.nome,
    isAdmin: user.isAdmin ?? false,
  });
}
