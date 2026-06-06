# Finanças da Casa 🏠💰

App de finanças pessoais do casal (PWA) — controle por **ciclos do cartão**,
rendas recorrentes, gastos por categoria e projeções de cenários.

> **Fase atual: 1 — UI com dados de exemplo em memória.**
> Nada é salvo ainda: ao recarregar a página, os dados voltam ao exemplo.
> A integração com o Supabase (persistência + login) vem na Fase 2.

## Rodar localmente

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

Outros comandos:

```bash
npm run build      # build de produção
npm run preview    # serve o build (útil pra testar o PWA instalado)
npm run gen-icons  # regenera os ícones do PWA a partir de public/favicon.svg
```

### Instalar na tela de início do iPhone
1. Rode `npm run build && npm run preview` (ou faça deploy).
2. Abra a URL no **Safari** do iPhone.
3. Compartilhar → **Adicionar à Tela de Início**.

## Estrutura

```
src/
  types.ts            # modelo de dados (espelha as tabelas do Supabase)
  data/mockData.ts    # 👈 dados de exemplo (troque o nome do esposo aqui)
  store/AppContext.tsx# estado em memória + lógica de ciclos e CRUD
  utils/
    cycles.ts         # virada de ciclo pelo dia de fechamento
    format.ts         # moeda e datas em pt-BR
  components/         # UI compartilhada
  pages/             # Dashboard, Ciclo, Rendas, Cenários, Configurações
```

## Conceitos

- **Casa (household):** base única compartilhada pelo casal; cada um com seu login (Fase 2).
- **Ciclo:** vai do dia seguinte ao fechamento da fatura até o próximo fechamento.
  Ao virar, o próximo ciclo já nasce com as rendas recorrentes lançadas.
- **Cenário:** simula uma proposta de trabalho (rendas/gastos extras) e compara
  *atual vs. projetado*.

## Fase 2 — Supabase (próximo passo)

O SQL das tabelas + Row Level Security (RLS) está pronto em
[`supabase/schema.sql`](supabase/schema.sql). O passo a passo de criação do
projeto no site do Supabase será conduzido junto.
