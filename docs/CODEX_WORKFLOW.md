# CODEX WORKFLOW — PORTAL FUMEP

## Como iniciar uma sessão

Abra o Codex na raiz do repositório.

A instrução recomendada é:

> Execute o loop atual. Leia AGENTS.md, docs/CURRENT_LOOP.md e use a skill execute-loop. Não antecipe o próximo loop.

## Ordem de contexto

```text
AGENTS.md
↓
docs/CURRENT_LOOP.md
↓
skill execute-loop
↓
Plano canônico
↓
documentos especializados necessários
```

## Evite

Não peça:

```text
"crie o portal todo"
```

Prefira:

```text
"execute o loop atual"
```

O repositório já define qual loop está ativo.

## Ao final

O agente deve:
- atualizar LOOP_STATUS;
- avançar CURRENT_LOOP somente com aceite;
- executar checks disponíveis;
- commit;
- deixar worktree limpo.
