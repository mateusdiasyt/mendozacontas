# MendozaContas

Copiloto financeiro **pessoal** + **Arcade**, com contextos isolados, projeções e alertas.

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- **PostgreSQL** (Neon.tech) + **Prisma ORM**
- **Autenticação** JWT (jose + bcrypt)
- **Deploy** Vercel (GitHub → deploy contínuo)

## Regra principal

Dois contextos financeiros **isolados**:

- **PESSOAL** – finanças pessoais
- **ARCADE** – negócio

Dados nunca se misturam. Dinheiro do Arcade só vira pessoal via **Repasse** (gera despesa no Arcade + receita no Pessoal).

## Setup local

1. Clone e instale dependências:

   ```bash
   git clone https://github.com/mateusdiasyt/mendozacontas.git
   cd mendozacontas
   npm install
   ```

2. Configure o ambiente:

   ```bash
   cp .env.example .env
   ```

   Edite `.env` e defina:

   - `DATABASE_URL` – connection string do PostgreSQL (Neon ou local)
   - `JWT_SECRET` – chave secreta para tokens (obrigatório em produção)

3. Aplique as migrações:

   ```bash
   npx prisma migrate deploy
   ```

4. Rode o projeto:

   ```bash
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000). A home redireciona para `/dashboard`.

## Deploy (Vercel)

1. Conecte o repositório ao Vercel.
2. Configure as variáveis de ambiente no painel:
   - `DATABASE_URL` (Neon com pooler recomendado)
   - `JWT_SECRET`
3. O build usa `prisma generate && next build` (definido em `vercel.json`).
4. **Migrações**: rode na sua máquina ou em um job com `DATABASE_URL` apontando para o Neon:
   ```bash
   npx prisma migrate deploy
   ```

## Painel Admin

Usuários com **admin** podem acessar `/admin` para configurar chaves de API (ex.: Google Gemini, para o futuro chat com IA).

**Como tornar alguém admin:** no banco (Neon SQL Editor ou Prisma Studio), defina `isAdmin = true` para o usuário:

```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'seu@email.com';
```

Faça isso para cada conta que deve ter acesso ao Admin (ex.: a sua e da sua esposa).

## Estrutura do projeto

- `prisma/schema.prisma` – modelos (User, Receita, Despesa, Cartao, LancamentoCartao, Repasse) e enums (Contexto, TipoReceita, FormaPagamento)
- `src/app/api/auth/` – login e registro (JWT)
- `src/app/api/dashboard/` – resumo financeiro (requer auth)
- `src/app/dashboard/` – dashboard com cards (saldo pessoal, lucro Arcade, projeção, status, extra necessário)
- `src/app/login` e `src/app/register` – telas de autenticação
- `src/app/admin` – painel admin (chave Gemini etc.; só usuários com `isAdmin`)
- `src/app/api/admin/settings` – GET/PUT configurações (Gemini API key)
- `src/lib/` – db (Prisma client), auth (JWT/bcrypt), contexto, format

## Decisões técnicas

- **Prisma 6**: mantido para evitar adapter obrigatório e ESM do Prisma 7, garantindo compatibilidade com Next e Vercel.
- **Uma URL de banco**: uso apenas `DATABASE_URL` no schema; para Neon com pooler, migrações costumam funcionar com a mesma URL. Se precisar de URL direta, descomente `directUrl` no schema e defina `DIRECT_URL`.
- **JWT no localStorage**: token salvo no client para chamadas à API; em produção considere httpOnly cookie.
- **Dashboard sem auth**: a página de dashboard carrega mesmo sem login, exibindo valores zerados e aviso para fazer login.

## Próximos passos (módulos)

- CRUD de Receitas, Despesas, Cartões e Lançamentos de cartão
- Fluxo de Repasse (criar despesa Arcade + receita Pessoal)
- Alertas (risco mensal, gasto acima da média, extra necessário)
- Seleção de contexto (Pessoal/Arcade) no header e filtro em todas as listagens
