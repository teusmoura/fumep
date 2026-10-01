# CURRENT LOOP — migração FastAPI + Nuxt

## Estado

- Pilha NestJS/Next.js: loops até 5.30 concluídos; loop 5.31 interrompido sem commit e preservado no stash `b1bba349ce433efb2f4a9b1cb86739a3d004fca8` criado em 2026-09-25.
- Migração aprovada pelo responsável: FastAPI + Nuxt, preservando PostgreSQL, Redis e MinIO.
- Estratégia: aceitar cada funcionalidade isolada antes da integração entre as novas partes.
- MIG 1, MIG 2 e MIG 3.1–3.8: funcionalidades isoladas concluídas; evidências em `docs/LOOP_STATUS.md`.
- Contratos HTTP de autenticação: adiados para MIG 6, fase de integração, conforme estratégia canônica; não declarados concluídos.
- MIG 4.1 — Metadados isolados da Biblioteca: concluído em `30639aa`.
- MIG 4.2 — Validação isolada de imagem: concluído, 151 testes Python aprovados e 1 integração Redis opcional ignorada.
- MIG 4.3 — Armazenamento isolado MinIO: concluído, inclusive teste com MinIO real; evidências em `docs/LOOP_STATUS.md`.
- MIG 4.4 — Categorias isoladas da Biblioteca: concluído, 174 testes Python aprovados e 2 integrações opcionais ignoradas.
- MIG 4.5 — Duplicidade/seleção isoladas: concluído, 191 testes Python aprovados e 2 integrações opcionais ignoradas.
- MIG 4.6 — Validação e armazenamento PDF isolados: concluído, 220 testes Python aprovados, integração MinIO real aprovada e 1 integração Redis opcional ignorada.
- MIG 4.7 — Publicação isolada de PROCESS_MEDIA em Redis: concluído, 228 testes Python aprovados com Redis e MinIO reais.
- MIG 4.8 — Worker Python e inspeção isolada do original: concluído, 242 testes Python aprovados com Redis e MinIO reais.
- MIG 4.9 — Processamento de imagem completo e isolado: concluído, 253 testes Python aprovados com Redis e MinIO reais; estado/variantes ainda em fixture.
- MIG 4.10 — Uso e exclusão de mídia como fluxo isolado: concluído, 262 testes Python aprovados; fixture de estado, sem endpoint/UI ou PostgreSQL.
- MIG 5.1 — Page Builder básico de páginas isolado: concluído, editor demonstrativo Nuxt/SSR e checks completos aprovados; sem persistência.
- MIG 5.2 — Composição editorial avançada isolada: concluído, quatro blocos novos no editor/SSR e checks completos aprovados; sem persistência.
- **MIG 5.3 — FAQ, TABS e TABLE como conjunto editorial isolado: loop atual.**

## MIG 5.3 — FAQ, TABS e TABLE como conjunto editorial isolado

Expandir o builder Nuxt demonstrativo com FAQ (até 30 itens), TABS (até 8 abas, sem blocos aninhados) e TABLE (cabeçalhos/linhas estruturados, sem HTML livre). Cada tipo deve ter schema v1, editor controlado, renderer compartilhado pela prévia e página pública, fixture e testes. Consultar Page Builder canônico §§18–20, plano canônico loops 5.21–5.23 e regras de acessibilidade; não integrar FastAPI/PostgreSQL, publicação ou PageVersion.

Aceite: adicionar/editar/reordenar/remover os três tipos; FAQ e abas operáveis por teclado, tabela com semântica acessível; limites/estrutura inválida rejeitados; os sete blocos anteriores permanecem válidos. Checks completos, smoke SSR/a11y, status e commit.

## Próximo loop

**MIG 5.4 — Blocos de dados e recursos externos controlados.** Detalhar após aceite de FAQ/TABS/TABLE; manter funcionalidade completa por loop e não antecipar integração FastAPI/PostgreSQL.
