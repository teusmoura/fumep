# Migração canônica V1 — FastAPI + Nuxt

## Decisão e precedência

Em 2026-09-25, o responsável pelo Portal FUMEP interrompeu a execução dos loops da pilha NestJS/Next.js e aprovou FastAPI no backend e Nuxt (Vue, SSR) no frontend, preservando PostgreSQL, Redis e MinIO. Esta decisão substitui **somente as escolhas de implementação de stack** incompatíveis nos documentos V1 anteriores. Regras de domínio, segurança, autorização, dados, publicação, acessibilidade e operação continuam válidas.

Para a migração, a precedência é: este documento e o plano de migração abaixo → documentos especializados existentes para comportamento e invariantes → modelo lógico → implementação legada. Menções antigas a NestJS, Next.js, Drizzle, BullMQ, Sharp, Vitest ou Supertest são requisitos históricos de implementação, não instruções para o código novo. Não eliminar o código legado antes de equivalência testada e aceite explícito.

## Arquitetura-alvo

- Frontend público e administrativo: um aplicativo Nuxt com Vue, SSR para conteúdo público e TypeScript para componentes/contratos. Páginas de administração podem usar renderização cliente onde apropriado.
- Backend: FastAPI em Python, REST/OpenAPI e modelos Pydantic; autorização sempre no servidor.
- Persistência primária: PostgreSQL. Manter o schema e os dados existentes. A escolha de ORM/migrations Python será fechada antes de escrever nessa base; as migrations Drizzle existentes permanecem como histórico, não devem ser reaplicadas por outro gerador sem revisão.
- Sessão: Redis + cookie HttpOnly/SameSite, sem JWT; CSRF em mutações administrativas.
- Mídia: MinIO, validação de upload por extensão/MIME/assinatura e processamento em Worker separado. A biblioteca, referências de mídia e regras de exclusão permanecem. Adaptador Python de imagem/fila será decidido por funcionalidade, preservando idempotência e recuperação.
- Operação: Matomo, Nginx, Docker Compose e GitHub Actions permanecem, sujeitos a ajuste dos serviços de aplicação.
- Testes: pytest/TestClient no backend; testes Vue/Nuxt e Playwright/axe no frontend conforme a funcionalidade. Não contar testes legados como prova da implementação nova.

## Estratégia funcional antes da integração

Migrar e aceitar cada funcionalidade isoladamente com fixtures/contratos locais; somente depois conectar Nuxt, FastAPI, PostgreSQL, Redis e MinIO. Fixtures devem ser identificadas como demonstração e nunca simular persistência real. A integração terá testes de contrato e fluxo ponta a ponta próprios. Código legado permanece executável durante a transição para comparação; não se introduz fallback de produção entre pilhas sem decisão específica.

**Cadência ajustada em 2026-09-29:** uma funcionalidade isolada não deve ser quebrada em loops sucessivos de infraestrutura sem resultado completo. Agrupar as etapas técnicas necessárias em um loop com caminho executável e aceite verificável (por exemplo, job → Worker → variantes → estado final), preservando a fronteira de integração acima. Os loops MIG 4.1–4.8 já concluídos não são reabertos; esta regra orienta os próximos. A demonstração isolada não deve ser apresentada como recurso utilizável no navegador ou persistência de produção.

## Plano de migração em fatias

1. **MIG 1 — Páginas institucionais Nuxt**: `/`, `/etmsl`, `/cramam`, identidade, aparência claro/escuro/sistema, SSR, sem API. Testes de rota/semântica e build; navegador verificável.
2. **MIG 2 — API FastAPI básica**: health e projeção institucional com contratos/testes independentes, sem conectar o Nuxt.
3. **MIG 3 — Autenticação e autorização**: sessões Redis, cookie, CSRF, papéis/instituições, recuperação; testes de segurança independentes.
4. **MIG 4 — Biblioteca de mídia**: categorias, upload, seleção, remoção, Worker/variantes; preservar invariantes e testar cada subfuncionalidade separadamente.
5. **MIG 5 — Page Builder**: portar schemas/registry, renderers, editor e templates por bloco/feature, sem publicação prematura.
6. **MIG 6 — Integração**: conectar interfaces ao FastAPI e aos serviços de dados, executar contratos/E2E/a11y, migrar operação e retirar legado somente após paridade demonstrada.

Esta sequência é um roteiro de migração, não uma declaração de que todas as funcionalidades antigas já estão no ar. `docs/CURRENT_LOOP.md` identifica a fatia ativa; `docs/LOOP_STATUS.md` registra evidências.
