---
name: page-builder
description: Implemente e revise Page Builder, ContentBlocks, BlockRegistry, Preview, PageVersion e regras de publicação do Portal FUMEP.
---

# Page Builder

## Invariantes

- blocos pré-definidos;
- sem grid livre;
- sem CSS livre;
- `ContentBlock.owner_type = PAGE | ARTICLE`;
- `data` em JSONB;
- `schema_version` obrigatório;
- schema Zod por versão;
- Registry central;
- mesmo renderer em Preview e público;
- MediaUsage;
- anchor único por página;
- publicação bloqueia conteúdo inválido.

## Ao criar bloco

Implemente:
1. schema;
2. editor;
3. renderer;
4. registro;
5. testes;
6. acessibilidade aplicável.

Não implemente blocos fora do loop.
