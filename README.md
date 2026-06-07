# Finanças da Casa 🏠💰

App de finanças pessoais do casal (PWA) — controle por **ciclos do cartão**,
com renda líquida, gastos por categoria, custos fixos, parcelas, cartões,
patrimônio/empreendimentos e projeções. Multi-casa: cada casal tem seus dados,
isolados por **Row Level Security**.

**Stack:** React + TypeScript + Vite + Tailwind CSS · Supabase (Postgres + Auth
+ RLS) · PWA · deploy na Vercel.

---

## Rodar localmente

```bash
npm install
# crie o .env.local (veja abaixo) e então:
npm run dev            # http://localhost:5173
npm run dev -- --host  # expõe na rede (testar no celular pelo Wi-Fi)
```

Crie um **`.env.local`** na raiz (não vai pro Git):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Outros comandos:

```bash
npm run build      # build de produção (tsc + vite)
npm run preview    # serve o build localmente
npm run gen-icons  # regenera os ícones do PWA a partir de public/favicon.svg
```

---

## Backend (Supabase)

1. Crie um projeto no [supabase.com](https://supabase.com) e ative a **Data API**
   (schema `public`).
2. No **SQL Editor**, rode na ordem:
   - [`supabase/schema.sql`](supabase/schema.sql) — tabelas + RLS
   - migrações (na ordem em que foram criadas):
     `migration_cycles_text.sql`, `migration_card_bills.sql`,
     `migration_fixed_payments.sql`, `migration_empreendimentos.sql`
   - [`supabase/seed.sql`](supabase/seed.sql) — casa + categorias + cartões
     (ajuste os UIDs dos usuários)
3. Em **Authentication → Users**, crie os logins (Auto Confirm).
4. Pegue **Project URL** e a **publishable key** (Settings → API) e ponha no
   `.env.local` (e nas env vars da Vercel).

> `supabase/schema.sql` é a referência completa e já reflete tudo; as migrações
> existem para atualizar bancos criados antes de cada mudança.

### Outras casas / demo
- [`supabase/seed_nova_casa.sql`](supabase/seed_nova_casa.sql) — cria uma casa
  nova isolada (ex.: sogros).
- [`supabase/seed_exemplo.sql`](supabase/seed_exemplo.sql) — casa de demonstração
  cheia de dados de exemplo.

---

## Deploy (Vercel)

1. Importe o repositório na [Vercel](https://vercel.com) (detecta Vite).
2. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Deploy. `vercel.json` + `public/_redirects` já cuidam do roteamento SPA.
4. Cada `git push` na `main` republica automaticamente.

No iPhone: abra a URL no Safari → **Compartilhar → Adicionar à Tela de Início**.

---

## Funcionalidades

- **Ciclos pelo cartão:** períodos do dia de fechamento ao próximo (não
  mês-calendário), calculados no app; navegação por histórico e futuro.
- **Rendas:** valor bruto com **imposto (%)**, **desconto fixo (R$)** e
  **descontos (%)** opcionais → renda líquida.
- **Gastos:** lançamento manual (à vista ou parcelado), por categoria e cartão.
- **Importar fatura:** lê CSV (com cabeçalho `data;descricao;valor;categoria;`
  `parcela;cartao`), OFX e PDF; categorização por regras que aprendem.
- **Custos fixos:** recorrentes em todo ciclo, com check de **pago/não pago** por
  ciclo.
- **Compras parceladas:** uma parcela por ciclo; importar fatura cria o
  parcelamento e projeta as parcelas seguintes (com dedup).
- **Cartão:** fatura parcial do mês, atualizada à mão, por cartão.
- **Patrimônio:** investimentos que rendem (% a.m.), **bens/empreendimentos**
  (custo mensal + adicionais por ciclo + datas), e custos de investimento
  (consórcio — fora da projeção). Projeção do patrimônio com juros compostos.
- **Dashboard:** renda, **Gastos × Investido**, saldo, por categoria, por cartão.
- **Cenários:** simula propostas (rendas/gastos extras) — atual vs. projetado.
- **Responsivo:** mobile-first (barra inferior) e desktop (barra lateral); PWA.

---

## Estrutura

```
src/
  types.ts              # modelo de dados (espelha as tabelas do Supabase)
  lib/
    supabase.ts         # cliente Supabase
    db.ts               # leitura/gravação (snake_case ↔ camelCase)
  auth/AuthContext.tsx  # login/sessão (email + senha)
  store/AppContext.tsx  # estado, ciclos, derivações e ações (otimista + persist)
  utils/                # cycles, format, income, parseStatement, pdf, categoryRules
  components/           # Layout, Sidebar, BottomNav, inputs, charts, etc.
  pages/                # Dashboard, Ciclo, Cartão, Rendas, Fixos, Patrimônio,
                        # Cenários, Importar, Config, Login
supabase/               # schema.sql, migrações e seeds
```

## Conceitos

- **Casa (household):** cada casal tem a sua; os dois membros compartilham os
  dados, isolados de outras casas por RLS.
- **Ciclo:** vai do dia seguinte ao fechamento da fatura até o próximo
  fechamento; o `cycle_id` é um texto calculado no app (ex.: `cycle-2026-07-05`).
- **Investido vs. Gasto:** aportes/consórcio/empreendimentos saem do caixa mas
  contam como *Investido* (não como consumo).

## Privacidade

Faturas/extratos e dados financeiros **não** vão para o Git (ver `.gitignore`);
a importação é processada no próprio aparelho; sem logs de dados sensíveis.
```
