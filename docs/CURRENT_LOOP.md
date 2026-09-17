# CURRENT LOOP

## Estado

```text
LOOP 0.1 — CONCLUÍDO
LOOP 0.2 — CONCLUÍDO
LOOP 0.3 — CONCLUÍDO
LOOP 0.4 — CONCLUÍDO
LOOP 0.5 — CONCLUÍDO
LOOP 0.6 — CONCLUÍDO
LOOP 0.7 — CONCLUÍDO
LOOP 0.8 — CONCLUÍDO
LOOP 0.9 — CONCLUÍDO
LOOP 0.10 — CONCLUÍDO
LOOP 0.11 — CONCLUÍDO
LOOP 0.12 — CONCLUÍDO
LOOP 0.13 — CONCLUÍDO
LOOP 0.14 — CONCLUÍDO
LOOP 0.15 — CONCLUÍDO
LOOP 0.16 — CONCLUÍDO
LOOP 0.17 — CONCLUÍDO
LOOP 1.1 — CONCLUÍDO
LOOP 1.2 — CONCLUÍDO
LOOP 1.3 — CONCLUÍDO
LOOP 1.4 — CONCLUÍDO
LOOP 1.5 — CONCLUÍDO
LOOP 1.6 — CONCLUÍDO
LOOP 1.7 — CONCLUÍDO
LOOP 1.8 — CONCLUÍDO
LOOP 1.9 — CONCLUÍDO
LOOP 1.10 — CONCLUÍDO
LOOP 2.1 — CONCLUÍDO
LOOP 2.2 — CONCLUÍDO
LOOP 2.3 — CONCLUÍDO
LOOP 2.4 — CONCLUÍDO
LOOP 2.5 — CONCLUÍDO
LOOP 2.6 — CONCLUÍDO
LOOP 2.7 — CONCLUÍDO
LOOP 2.8 — CONCLUÍDO
LOOP 2.9 — CONCLUÍDO
LOOP 2.10 — CONCLUÍDO
LOOP 2.11 — CONCLUÍDO
LOOP 2.12 — CONCLUÍDO
LOOP 2.13 — CONCLUÍDO
LOOP 2.14 — CONCLUÍDO
LOOP 2.15 — CONCLUÍDO
LOOP 2.16 — CONCLUÍDO
LOOP 3.1 — CONCLUÍDO
LOOP 3.2 — CONCLUÍDO
LOOP 3.3 — CONCLUÍDO
LOOP 3.4 — CONCLUÍDO
LOOP 3.5 — CONCLUÍDO
LOOP 3.6 — CONCLUÍDO
LOOP 3.7 — CONCLUÍDO
LOOP 3.8 — CONCLUÍDO
LOOP 3.9 — CONCLUÍDO
LOOP 4.1 — CONCLUÍDO
LOOP 4.2 — CONCLUÍDO
LOOP 4.3 — CONCLUÍDO
LOOP 4.4 — CONCLUÍDO
LOOP 4.5 — CONCLUÍDO
LOOP 4.6 — CONCLUÍDO
LOOP 4.7 — CONCLUÍDO
LOOP 4.8 — CONCLUÍDO
LOOP 4.9 — CONCLUÍDO
LOOP 4.10 — CONCLUÍDO
LOOP 4.11 — CONCLUÍDO
LOOP 4.12 — CONCLUÍDO
LOOP 4.13 — CONCLUÍDO
LOOP 4.14 — CONCLUÍDO
LOOP 4.15 — CONCLUÍDO
LOOP 4.16 — CONCLUÍDO
LOOP 4.17 — CONCLUÍDO
LOOP 5.1 — CONCLUÍDO
LOOP 5.2 — CONCLUÍDO
LOOP 5.3 — CONCLUÍDO
LOOP 5.4 — CONCLUÍDO
LOOP 5.5 — CONCLUÍDO
LOOP 5.6 — CONCLUÍDO
LOOP 5.7 — ATUAL
```

## Loop atual

### LOOP 5.7 — HERO editor e renderer

Estado: pronto para execução após commit do 5.6. Contrato HERO v1 implementado, checks verdes (353 testes). Revalidar commit/Git limpo antes de iniciar.

Objetivo:

```text
Editor e renderer HERO v1 seguros/acessíveis, validando alt e CTA.
```

Implementar:

- reler AGENTS.md, execute-loop, plano, PAGE_BUILDER_CONTENT_BLOCKS.md e FRONTEND; confirmar 5.6 commitado e Git limpo;
- usar page-builder, nextjs-frontend, architecture-guard e testing-qa conforme escopo;
- editor visual HERO controlado sem persistência própria, usando contrato v1 e imagens disponíveis fornecidas pelo caller;
- renderer SSR imagem-only com alt explícito/CTA seguro, sem endereços internos MinIO; resolução/disponibilidade autorizada de mídia pertence ao consumidor backend futuro;
- definição HERO completa no Registry frontend somente para PAGE, sem placeholders/outros blocos;
- controles acessíveis, feedback/foco, responsividade/tokens e testes de alt/CTA;
- testes, checks disponíveis, documentação, commit e Git limpo.

Não implementar:

- IMAGE (5.8) ou outros blocos, Page Builder básico, endpoints/preview/publicação ou novos consumidores antecipados.

Critério de aceite:

```text
Editor/renderer HERO imagem-only com alt e CTA validados, seguros/acessíveis, testados, documentados e checks verdes.
```

## Próximo loop

```text
LOOP 5.8 — IMAGE v1
```
