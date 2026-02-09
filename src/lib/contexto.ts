/**
 * Contextos financeiros: "Pessoal" (fixo) + empresas cadastradas no admin.
 * Regra: dados nunca misturados; empresa → Pessoal só via REPASSE.
 */

export const PESSOAL_ID = "PESSOAL";

export type ContextoOption = { value: string; label: string };

/** Gera lista para select: Pessoal + empresas (ordenadas por ordem, depois nome). */
export function buildContextoOptions(empresas: { id: string; nome: string; ordem: number }[]): ContextoOption[] {
  const list: ContextoOption[] = [{ value: PESSOAL_ID, label: "Pessoal" }];
  const sorted = [...empresas].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
  sorted.forEach((e) => list.push({ value: e.id, label: e.nome }));
  return list;
}

export function isPessoal(contexto: string): boolean {
  return contexto === PESSOAL_ID;
}

export function isEmpresa(contexto: string): boolean {
  return contexto !== PESSOAL_ID && contexto.length > 0;
}
