-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Contexto" AS ENUM ('PESSOAL', 'ARCADE');

-- CreateEnum
CREATE TYPE "TipoReceita" AS ENUM ('FIXA', 'EXTRA', 'ARCADE_DIARIA', 'REPASSE');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receita" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" DATE NOT NULL,
    "tipo" "TipoReceita" NOT NULL,
    "contexto" "Contexto" NOT NULL,
    "observacao" TEXT,
    "userId" TEXT NOT NULL,
    "repasseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Despesa" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "categoria" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "contexto" "Contexto" NOT NULL,
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "repasseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cartao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "limite" DECIMAL(12,2) NOT NULL,
    "fechamento" INTEGER NOT NULL,
    "vencimento" INTEGER NOT NULL,
    "contexto" "Contexto" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cartao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LancamentoCartao" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "parcelaAtual" INTEGER NOT NULL DEFAULT 1,
    "cartaoId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "dataCompra" DATE NOT NULL,
    "contexto" "Contexto" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LancamentoCartao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repasse" (
    "id" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repasse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Receita_repasseId_key" ON "Receita"("repasseId");

-- CreateIndex
CREATE INDEX "Receita_userId_contexto_data_idx" ON "Receita"("userId", "contexto", "data");

-- CreateIndex
CREATE UNIQUE INDEX "Despesa_repasseId_key" ON "Despesa"("repasseId");

-- CreateIndex
CREATE INDEX "Despesa_userId_contexto_data_idx" ON "Despesa"("userId", "contexto", "data");

-- CreateIndex
CREATE INDEX "Cartao_userId_contexto_idx" ON "Cartao"("userId", "contexto");

-- CreateIndex
CREATE INDEX "LancamentoCartao_cartaoId_dataCompra_idx" ON "LancamentoCartao"("cartaoId", "dataCompra");

-- CreateIndex
CREATE INDEX "LancamentoCartao_userId_contexto_idx" ON "LancamentoCartao"("userId", "contexto");

-- CreateIndex
CREATE INDEX "Repasse_userId_data_idx" ON "Repasse"("userId", "data");

-- AddForeignKey
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_repasseId_fkey" FOREIGN KEY ("repasseId") REFERENCES "Repasse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_repasseId_fkey" FOREIGN KEY ("repasseId") REFERENCES "Repasse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cartao" ADD CONSTRAINT "Cartao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoCartao" ADD CONSTRAINT "LancamentoCartao_cartaoId_fkey" FOREIGN KEY ("cartaoId") REFERENCES "Cartao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoCartao" ADD CONSTRAINT "LancamentoCartao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repasse" ADD CONSTRAINT "Repasse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
