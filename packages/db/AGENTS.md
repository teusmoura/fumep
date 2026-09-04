# AGENTS.md — packages/db

Escopo: Drizzle schema, migrations e acesso ao PostgreSQL.

## Regras
- UUID para entidades principais.
- TIMESTAMPTZ para data/hora.
- snake_case no banco.
- Migrations devem ser compatíveis com estratégia expand/migrate/contract.
- Não criar tabelas não previstas sem justificar.
- `Page` é N:1 com `Institution`; não criar `page_institutions`.
- Não criar `analytics_events` para page views; navegação pertence ao Matomo.
- Respeitar `docs/architecture/MODELO_DE_DADOS_LOGICO_V1_PORTAL_FUMEP_CANONICO.md`.

## Validação
Migration deve aplicar em banco limpo e testes de repository devem passar.
