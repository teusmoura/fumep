# Portal FUMEP — Codex Starter Workspace

Workspace preparado para implementação incremental da V1 do Portal FUMEP com Codex.

## Para começar

1. Extraia o ZIP.
2. Abra a pasta `portal-fumep` no Codex.
3. Leia `START_CODEX.md`.
4. Peça ao Codex para executar o loop atual.

## Estado

```text
LOOP 0.1 — concluído
LOOP 0.2 — atual
```

## Arquivos de controle

- `AGENTS.md` — regras globais do agente.
- `.agents/skills/` — skills específicas do projeto.
- `docs/CURRENT_LOOP.md` — única fonte do loop ativo.
- `docs/LOOP_STATUS.md` — evidências e progresso.
- `docs/architecture/` — arquitetura canônica.
- `docs/CODEX_WORKFLOW.md` — modo recomendado de uso.
- `START_CODEX.md` — prompt inicial.

## Regra principal

Não peça ao Codex para implementar o portal inteiro. Peça:

```text
Execute o loop atual.
```

O repositório fornece o restante do contexto.
