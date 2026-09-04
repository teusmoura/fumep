# AGENTS.md — packages/validation

Escopo: contratos Zod compartilhados.

## Regras
- Schemas são contratos; evitar divergência web/API.
- ContentBlocks possuem schema versionado.
- Alteração incompatível exige nova versão de schema.
- Não aceitar HTML/URL insegura silenciosamente.
- Manter schemas pequenos e compostáveis.

## Validação
Testar casos válidos e inválidos.
