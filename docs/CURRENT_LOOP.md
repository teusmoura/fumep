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
- **MIG 5.1 — Page Builder básico de páginas como funcionalidade isolada: loop atual.**

## MIG 5.1 — Page Builder básico de páginas como funcionalidade isolada

Entregar um caminho editorial isolado e verificável no Nuxt: criar/editar localmente uma página com blocos TEXT, HERO e IMAGE usando schemas versionados, BlockRegistry, controles estruturados, preview e os mesmos renderers para página pública demonstrativa. Incluir upload/seleção de mídia somente como fixture explícita, sem sugerir persistência. Agrupar contrato, editor, renderização, estado e testes numa única funcionalidade, sem dividir novamente por bloco. Consultar Page Builder canônico, Design System e loops canônicos 5.1–5.9; preservar sanitização, alt e CTA válidos e não permitir CSS/grid livre.

Aceite: o fluxo demonstrativo permite adicionar, editar, reordenar e remover TEXT/HERO/IMAGE, rejeita conteúdo inválido, mostra preview correspondente ao rendering público e passa testes de componentes/SSR/acessibilidade aplicáveis. Não declarar publicação, PageVersion, MediaUsage persistente ou integração FastAPI/PostgreSQL como concluídos.

## Próximo loop

**MIG 5.2 — Blocos avançados do Page Builder.** Detalhar após aceite do builder básico, mantendo funcionalidade completa por loop e sem antecipar integração FastAPI/PostgreSQL.
