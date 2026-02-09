import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/health - Verifica se o banco está acessível e as tabelas existem.
 * Útil para debugar 500 no register (falta DATABASE_URL ou migração não rodou).
 */
export async function GET() {
  const checks: Record<string, string> = {};

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL não está definida nas variáveis de ambiente." },
      { status: 500 }
    );
  }
  checks.DATABASE_URL = "definida";

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db_connection = "ok";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "Falha ao conectar no banco.", detail: msg, checks },
      { status: 500 }
    );
  }

  try {
    await prisma.user.findFirst();
    checks.table_user = "ok";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        error: "Tabela User não existe ou erro de permissão. Rode a migração no Neon (SQL do migration.sql).",
        detail: msg,
        checks,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, checks });
}
