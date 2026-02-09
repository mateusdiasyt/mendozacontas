/**
 * Cliente Prisma singleton - seguro para serverless (Vercel).
 * Evita múltiplas instâncias em hot reload.
 */
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL?.trim();
if (!url || (!url.startsWith("postgresql://") && !url.startsWith("postgres://"))) {
  throw new Error(
    "DATABASE_URL inválida ou ausente. Defina em Vercel (Settings → Environment Variables) uma URL no formato: postgresql://user:senha@host:5432/banco?sslmode=require"
  );
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
