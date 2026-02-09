-- CreateEnum
CREATE TYPE "LayoutCartao" AS ENUM ('GENERICO', 'NUBANK', 'ITAU');

-- AlterTable
ALTER TABLE "Cartao" ADD COLUMN "layout" "LayoutCartao" NOT NULL DEFAULT 'GENERICO';
