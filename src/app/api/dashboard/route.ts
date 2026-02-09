import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

    return NextResponse.json({
      saldoPessoalAtual,
      lucroArcadeMes,
      projecaoArcadeMes,
      mediaDiariaArcade,
      projecaoFechamentoPessoal,
      status,
      extraNecessario,
      contexto,
      periodo: { inicioMes, fimMes, diasNoMes, diaAtual },
    });
  } catch (e) {
    console.error("Dashboard error:", e);
    return NextResponse.json(
      { error: "Erro ao carregar resumo" },
      { status: 500 }
    );
  }
}
