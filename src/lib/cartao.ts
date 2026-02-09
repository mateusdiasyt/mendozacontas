/**
 * Ciclo de fatura: fechamento no dia N → compras do dia N+1 (mês anterior) até dia N (mês atual).
 * Ex.: fechamento 10 → ciclo 11/jan a 10/fev.
 */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getCicloFatura(fechamento: number, ref: Date): { start: Date; end: Date } {
  const dia = ref.getDate();
  const ano = ref.getFullYear();
  const mes = ref.getMonth();

  if (dia <= fechamento) {
    // Ciclo que fecha neste mês: (F+1) do mês anterior até F deste mês
    const endDay = Math.min(fechamento, lastDayOfMonth(ano, mes));
    const end = new Date(ano, mes, endDay);
    const startDay = Math.min(fechamento + 1, lastDayOfMonth(ano, mes - 1));
    const start = new Date(ano, mes - 1, startDay);
    return { start, end };
  }
  // Ciclo que fecha no próximo mês: (F+1) deste mês até F do próximo
  const endDay = Math.min(fechamento, lastDayOfMonth(ano, mes + 1));
  const end = new Date(ano, mes + 1, endDay);
  const startDay = Math.min(fechamento + 1, lastDayOfMonth(ano, mes));
  const start = new Date(ano, mes, startDay);
  return { start, end };
}
