---
name: execute-loop
description: Execute o loop atual do Plano de Implementação do Portal FUMEP com escopo estrito, validação, atualização de status e commit.
---

# Execute Loop

## Quando usar

Use sempre que o usuário pedir para iniciar, continuar, executar ou concluir um loop do Portal FUMEP.

## Workflow

1. Leia `docs/CURRENT_LOOP.md`.
2. Localize o loop correspondente em `docs/architecture/PLANO_IMPLEMENTACAO_V1_LOOPS_CANONICO.md`.
3. Leia somente os documentos especializados necessários ao loop.
4. Verifique `git status`.
5. Escreva uma lista curta do escopo atual em `docs/LOOP_STATUS.md`.
6. Implemente apenas o loop.
7. Não antecipe loops seguintes.
8. Execute os checks que já existirem.
9. Corrija falhas introduzidas.
10. Atualize `docs/LOOP_STATUS.md` com evidências.
11. Se o aceite estiver completo, atualize `docs/CURRENT_LOOP.md` para o próximo loop.
12. Commit.
13. Confirme worktree limpo.

## Bloqueio arquitetural

Se houver contradição:
- consulte o manifesto;
- consulte o documento especializado;
- use `$architecture-guard`;
- registre o conflito se ainda persistir;
- não invente decisão.

## Saída final

Informe:
- loop;
- mudança;
- checks;
- commit;
- próximo loop.
