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
LOOP 5.16 — ATUAL
```

## Loop atual

### LOOP 5.16 — IMAGE_TEXT

Estado: pronto após commit do 5.15. Backgrounds concluídos, checks verdes (414 testes). Revalidar commit e Git limpo.

Objetivo:

```text
Implementar IMAGE_TEXT completo com variantes controladas IMAGE_LEFT/IMAGE_RIGHT.
```

Implementar:

- reler AGENTS.md, execute-loop, plano, PAGE_BUILDER_CONTENT_BLOCKS.md e FRONTEND; confirmar 5.15 commitado e Git limpo;
- usar page-builder, nextjs-frontend, architecture-guard e testing-qa conforme escopo;
- schema Zod por versão para IMAGE_TEXT, contratos controlados IMAGE_LEFT/IMAGE_RIGHT e campos previstos no especializado, sem HTML/CSS livres;
- editor acessível com seleção de imagem pronta da Biblioteca e texto rico seguro reutilizando contratos existentes, callback async/falha retida;
- renderer SSR responsivo reutilizando texto/imagem/background seguros e descriptor/tema resolvidos pelo caller, sem novos gateways/Preview/publicação antecipados;
- registrar definição completa em Registry/contextos permitidos e integrar criação no builder, sem antecipar CARDS;
- preservar contrato de MediaUsage do owner/backend futuro sem criar persistência antecipada;
- manter contrato de caller explícito, sem criar publicação, Preview ou gateways antecipados;
- controles acessíveis/teclado/foco, estados inválidos retidos, tokens e responsividade;
- testes, checks disponíveis, documentação, commit e Git limpo.

Não implementar:

- CARDS (5.17), outros blocos/Preview/publicação/salvamento amplo antecipados.

Critério de aceite:

```text
IMAGE_TEXT com schema/editor/renderer/Registry, variantes controladas, mídia e texto seguros, responsividade/A11y, testes/documentação/checks verdes.
```

## Próximo loop

```text
LOOP 5.17 — CARDS
```
