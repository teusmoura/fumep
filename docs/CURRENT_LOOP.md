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
LOOP 0.17 — ATUAL
```

## Loop atual

### LOOP 0.17 — Branch protection

Objetivo:

```text
Proteger a branch principal contra merges sem a CI aprovada.
```

Implementar:

- configuração da branch `main` no GitHub;
- exigência do check obrigatório da CI antes do merge.

Não implementar:

- regras adicionais de governança não previstas;
- deploy ou publicação;
- funcionalidades da fase de banco e domínio.

Critério de aceite:

```text
Merge bloqueado se checks falharem.
```

## Próximo loop

```text
LOOP 1.1 — Configurar Drizzle
```
