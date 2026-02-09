-- CreateTable: Empresa (contextos de negócio cadastrados no admin)
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Empresa_userId_idx" ON "Empresa"("userId");

ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: contexto enum -> text (PostgreSQL: cast enum to text)
ALTER TABLE "Receita" ALTER COLUMN "contexto" TYPE TEXT USING "contexto"::TEXT;
ALTER TABLE "Despesa" ALTER COLUMN "contexto" TYPE TEXT USING "contexto"::TEXT;
ALTER TABLE "Cartao" ALTER COLUMN "contexto" TYPE TEXT USING "contexto"::TEXT;
ALTER TABLE "LancamentoCartao" ALTER COLUMN "contexto" TYPE TEXT USING "contexto"::TEXT;

-- Inserir uma empresa "Arcade" por usuário que tenha algum registro ARCADE e atualizar referências
INSERT INTO "Empresa" ("id", "nome", "ordem", "userId", "createdAt", "updatedAt")
SELECT 
  'e' || substr(md5("uid"::text || row_number() OVER ()::text), 1, 24),
  'Arcade',
  0,
  "uid",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "userId" AS "uid" FROM (
    SELECT "userId" FROM "Receita" WHERE "contexto" = 'ARCADE'
    UNION SELECT "userId" FROM "Despesa" WHERE "contexto" = 'ARCADE'
    UNION SELECT "userId" FROM "Cartao" WHERE "contexto" = 'ARCADE'
    UNION SELECT "userId" FROM "LancamentoCartao" WHERE "contexto" = 'ARCADE'
  ) t
) u;

UPDATE "Receita" r SET "contexto" = e."id"
FROM "Empresa" e
WHERE e."userId" = r."userId" AND r."contexto" = 'ARCADE';

UPDATE "Despesa" d SET "contexto" = e."id"
FROM "Empresa" e
WHERE e."userId" = d."userId" AND d."contexto" = 'ARCADE';

UPDATE "Cartao" c SET "contexto" = e."id"
FROM "Empresa" e
WHERE e."userId" = c."userId" AND c."contexto" = 'ARCADE';

UPDATE "LancamentoCartao" l SET "contexto" = e."id"
FROM "Empresa" e
WHERE e."userId" = l."userId" AND l."contexto" = 'ARCADE';

-- DropEnum
DROP TYPE "Contexto";
