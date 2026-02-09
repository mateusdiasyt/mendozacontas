/**
 * Autenticação simples com JWT (jose) e bcrypt.
 * Uso: login retorna token; APIs validam Authorization: Bearer <token>.
 */
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "mendozacontas-dev-secret-alterar-em-prod"
);
const JWT_ISSUER = "mendozacontas";
const JWT_EXPIRATION = "7d";

export type JWTPayload = { sub: string; email: string };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: JWT_ISSUER });
    const sub = payload.sub as string;
    const email = payload.email as string;
    if (!sub || !email) return null;
    return { sub, email };
  } catch {
    return null;
  }
}

export async function getUserFromToken(token: string | null) {
  if (!token?.startsWith("Bearer ")) return null;
  const payload = await verifyToken(token.slice(7));
  if (!payload) return null;
  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, nome: true, isAdmin: true },
  });
}
