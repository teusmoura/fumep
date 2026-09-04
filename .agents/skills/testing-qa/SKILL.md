---
name: testing-qa
description: Planeje, escreva e execute testes do Portal FUMEP conforme Vitest, Supertest, Playwright, axe-core e critérios de CI.
---

# Testing QA

## Ferramentas

- Vitest: unitário
- Supertest: API
- Playwright: E2E
- axe-core: acessibilidade
- Lighthouse: complementar

## Prioridades

1. autorização;
2. publicação;
3. mídia;
4. busca;
5. integrações;
6. jobs;
7. versionamento.

## Regras

- não usar produção;
- fixtures determinísticas;
- mocks para APIs externas;
- screenshot visual apenas em pontos críticos;
- não aprovar merge com check obrigatório falhando.

Ao concluir, liste exatamente os comandos executados e seus resultados.
