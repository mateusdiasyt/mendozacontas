import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCicloFatura } from "@/lib/cartao";
import type { Contexto } from "@prisma/client";
import { startOfMonth, endOfMonth, subMonths, differenceInDays, lastDayOfMonth } from "date-fns";

/**
 * Resumo do dashboard: saldo pessoal, lucro Arcade, projeções e status.
 * Todos os valores consideram o contexto selecionado e o mês atual.
 */
export async function GET(request: Request) {
  const user = await getUserFromToken(request.headers.get("authorization") ?? null);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contexto = (searchParams.get("contexto") ?? "PESSOAL") as Contexto;

  const now = new Date();
  const inicioMes = startOfMonth(now);
  const fimMes = endOfMonth(now);
  const diasNoMes = differenceInDays(lastDayOfMonth(now), inicioMes) + 1;
  const diaAtual = now.getDate();

  try {
    // Receitas e despesas do mês por contexto
    const [receitasPessoal, despesasPessoal, receitasArcade, despesasArcade] = await Promise.all([
      prisma.receita.aggregate({
        where: { userId: user.id, contexto: "PESSOAL", data: { gte: inicioMes, lte: fimMes } },
        _sum: { valor: true },
      }),
      prisma.despesa.aggregate({
        where: { userId: user.id, contexto: "PESSOAL", data: { gte: inicioMes, lte: fimMes } },
        _sum: { valor: true },
      }),
      prisma.receita.aggregate({
        where: { userId: user.id, contexto: "ARCADE", data: { gte: inicioMes, lte: fimMes } },
        _sum: { valor: true },
      }),
      prisma.despesa.aggregate({
        where: { userId: user.id, contexto: "ARCADE", data: { gte: inicioMes, lte: fimMes } },
        _sum: { valor: true },
      }),
    ]);

    const toNum = (v: unknown) => (v != null ? Number(v) : 0);

    const totalReceitasPessoal = toNum(receitasPessoal._sum?.valor);
    const totalDespesasPessoal = toNum(despesasPessoal._sum?.valor);
    const totalReceitasArcade = toNum(receitasArcade._sum?.valor);
    const totalDespesasArcade = toNum(despesasArcade._sum?.valor);

    const saldoPessoalAtual = totalReceitasPessoal - totalDespesasPessoal;
    const lucroArcadeMes = totalReceitasArcade - totalDespesasArcade;

    // Média diária Arcade: último mês completo para projeção
    const inicioMesAnterior = startOfMonth(subMonths(now, 1));
    const fimMesAnterior = endOfMonth(subMonths(now, 1));
    const arcadeMesAnterior = await prisma.receita.aggregate({
      where: {
        userId: user.id,
        contexto: "ARCADE",
        data: { gte: inicioMesAnterior, lte: fimMesAnterior },
      },
      _sum: { valor: true },
    });
    const despesasArcadeAnterior = await prisma.despesa.aggregate({
      where: {
        userId: user.id,
        contexto: "ARCADE",
        data: { gte: inicioMesAnterior, lte: fimMesAnterior },
      },
      _sum: { valor: true },
    });
    const lucroArcadeAnterior =
      toNum(arcadeMesAnterior._sum?.valor) - toNum(despesasArcadeAnterior._sum?.valor);
    const diasMesAnterior = differenceInDays(fimMesAnterior, inicioMesAnterior) + 1;
    const mediaDiariaArcade = diasMesAnterior > 0 ? lucroArcadeAnterior / diasMesAnterior : 0;
    const projecaoArcadeMes = mediaDiariaArcade * diasNoMes;

    // Projeção pessoal: receitas - despesas (simplificado; não considera parcelas futuras)
    const projecaoFechamentoPessoal = totalReceitasPessoal - totalDespesasPessoal;

    // Status: OK / Atenção / Crítico (baseado em saldo e projeção)
    let status: "OK" | "ATENCAO" | "CRITICO" = "OK";
    if (projecaoFechamentoPessoal < 0) status = "CRITICO";
    else if (projecaoFechamentoPessoal < totalDespesasPessoal * 0.2) status = "ATENCAO";

    // Extra necessário para fechar no azul (se negativo)
    const extraNecessario = projecaoFechamentoPessoal >= 0 ? 0 : Math.abs(projecaoFechamentoPessoal);

    // Fatura dos cartões (ciclo atual de cada cartão)
    const cartoes = await prisma.cartao.findMany({ where: { userId: user.id } });
    let totalFaturaCartoes = 0;
    for (const c of cartoes) {
      const { start, end } = getCicloFatura(c.fechamento, now);
      const sum = await prisma.lancamentoCartao.aggregate({
        where: { cartaoId: c.id, dataCompra: { gte: start, lte: end } },
        _sum: { valor: true },
      });
      totalFaturaCartoes += Number(sum._sum?.valor ?? 0);
    }

    // Quanto pode gastar (projeção menos compromisso com faturas)
    const quantoPodeGastar = Math.max(0, projecaoFechamentoPessoal - totalFaturaCartoes);

    // Dados para gráficos: receitas e despesas por dia (mês atual PESSOAL)
    const [receitasList, despesasList] = await Promise.all([
      prisma.receita.findMany({
        where: { userId: user.id, contexto: "PESSOAL", data: { gte: inicioMes, lte: fimMes } },
        select: { data: true, valor: true },
      }),
      prisma.despesa.findMany({
        where: { userId: user.id, contexto: "PESSOAL", data: { gte: inicioMes, lte: fimMes } },
        select: { data: true, valor: true, categoria: true },
      }),
    ]);

    const receitasPorDia: Record<string, number> = {};
    const despesasPorDia: Record<string, number> = {};
    const despesasPorCategoria: Record<string, number> = {};
    for (let d = 1; d <= diasNoMes; d++) {
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      receitasPorDia[key] = 0;
      despesasPorDia[key] = 0;
    }
    for (const r of receitasList) {
      const key = r.data.toISOString().slice(0, 10);
      if (receitasPorDia[key] != null) receitasPorDia[key] += Number(r.valor);
    }
    for (const d of despesasList) {
      const key = d.data.toISOString().slice(0, 10);
      if (despesasPorDia[key] != null) despesasPorDia[key] += Number(d.valor);
      despesasPorCategoria[d.categoria] = (despesasPorCategoria[d.categoria] ?? 0) + Number(d.valor);
    }

    const fluxoPorDia = Object.entries(receitasPorDia)
      .map(([date, receita]) => ({
        date,
        receita,
        despesa: despesasPorDia[date] ?? 0,
        saldo: (receitasPorDia[date] ?? 0) - (despesasPorDia[date] ?? 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const categoriasChart = Object.entries(despesasPorCategoria).map(([name, value]) => ({
      name: name || "Outros",
      value: Math.round(value * 100) / 100,
    }));

    return NextResponse.json({
      saldoPessoalAtual,
      lucroArcadeMes,
      projecaoArcadeMes,
      mediaDiariaArcade,
      projecaoFechamentoPessoal,
      status,
      extraNecessario,
      totalFaturaCartoes,
      quantoPodeGastar,
      contexto,
      periodo: { inicioMes, fimMes, diasNoMes, diaAtual },
      chart: { fluxoPorDia, categoriasChart },
    });
  } catch (e) {
    console.error("Dashboard error:", e);
    return NextResponse.json(
      { error: "Erro ao carregar resumo" },
      { status: 500 }
    );
  }
}
