/**
 * Contextos financeiros - PESSOAL e ARCADE.
 * Regra: dados nunca misturados; Arcade → Pessoal só via REPASSE.
 */
import type { Contexto as ContextoPrisma } from "@prisma/client";

export type Contexto = ContextoPrisma;

export const CONTEXTOS: { value: Contexto; label: string }[] = [
  { value: "PESSOAL", label: "Pessoal" },
  { value: "ARCADE", label: "Arcade" },
];

export function isPessoal(c: Contexto): boolean {
  return c === "PESSOAL";
}

export function isArcade(c: Contexto): boolean {
  return c === "ARCADE";
}
