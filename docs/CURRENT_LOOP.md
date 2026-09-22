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
LOOP 5.9 — CONCLUÍDO
LOOP 5.10 — CONCLUÍDO
LOOP 5.11 — CONCLUÍDO
LOOP 5.12 — CONCLUÍDO
LOOP 5.13 — CONCLUÍDO
LOOP 5.14 — CONCLUÍDO
LOOP 5.15 — CONCLUÍDO
LOOP 5.16 — CONCLUÍDO
LOOP 5.17 — CONCLUÍDO
LOOP 5.18 — CONCLUÍDO
LOOP 5.19 — ATUAL
```

## Loop atual

### LOOP 5.19 — CTA

Estado: pronto após commit do 5.18. QUICK_LINKS concluído, checks verdes (445 testes). Revalidar commit e Git limpo.

Objetivo:

```text
Implementar CTA completo com title, text?, buttonLabel e buttonUrl.
```

Implementar:

- reler AGENTS.md, execute-loop, plano, PAGE_BUILDER_CONTENT_BLOCKS.md e FRONTEND; confirmar 5.18 commitado e Git limpo;
- usar page-builder, nextjs-frontend, architecture-guard e testing-qa conforme escopo;
- schema Zod por versão para CTA com title obrigatório, text?, buttonLabel e buttonUrl segura, com limites coerentes/documentados;
- editor acessível para editar o conteúdo e aplicar snapshot conjunto por callback async, mantendo campos na falha;
- renderer SSR responsivo com heading, texto e link nomeado, foco/contraste e BlockBackground/tema resolvidos pelo caller;
- registrar definição completa em Registry/contextos canônicos PAGE/ARTICLE e integrar criação no builder, sem antecipar SPACER;
- manter contrato de caller explícito, sem criar publicação, Preview ou gateways antecipados;
- controles acessíveis/teclado/foco, estados inválidos retidos, tokens e responsividade;
- testes, checks disponíveis, documentação, commit e Git limpo.

Não implementar:

- SPACER (5.20), HTML/CSS livre, múltiplos botões, imagens, outros blocos/Preview/publicação/salvamento amplo antecipados.

Critério de aceite:

```text
CTA disponível no Registry, Editor e Renderer em PAGE/ARTICLE, com URL segura, teclado/foco/contraste, testes/documentação/checks verdes.
```

## Próximo loop

```text
LOOP 5.20 — SPACER
```
