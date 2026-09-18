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
LOOP 5.7 — CONCLUÍDO
LOOP 5.8 — CONCLUÍDO
LOOP 5.9 — ATUAL
```

## Loop atual

### LOOP 5.9 — Page Builder básico

Estado: pronto após commit do 5.8. TEXT/HERO/IMAGE completos, checks verdes (383 testes). Revalidar commit e Git limpo.

Objetivo:

```text
Adicionar TEXT, HERO e IMAGE no Page Builder básico.
```

Implementar:

- reler AGENTS.md, execute-loop, plano, PAGE_BUILDER_CONTENT_BLOCKS.md e FRONTEND; confirmar 5.8 commitado e Git limpo;
- usar page-builder, nextjs-frontend, architecture-guard e testing-qa conforme escopo;
- compor apenas as definições completas existentes do Registry e seus editores para adição de TEXT/HERO/IMAGE;
- IDs únicos/position cumulativa, drafts estruturais e contexto autorizado pelo contrato (HERO apenas PAGE), referências Media.id;
- manter contrato de caller explícito, sem criar publicação, Preview ou gateways antecipados;
- controles acessíveis/teclado/foco, estados inválidos retidos, tokens e responsividade;
- testes, checks disponíveis, documentação, commit e Git limpo.

Não implementar:

- reordenação (5.10), duplicação (5.11), ocultação (5.12), exclusão (5.13), anchors/backgrounds UI ou outros blocos/Preview/publicação antecipados.

Critério de aceite:

```text
Page Builder básico adiciona TEXT/HERO/IMAGE respeitando contexto, contratos existentes e acessibilidade, com testes/documentação/checks verdes.
```

## Próximo loop

```text
LOOP 5.10 — Reordenar blocos
```
