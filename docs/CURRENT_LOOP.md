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
LOOP 2.10 — ATUAL
```

## Loop atual

### LOOP 2.10 — Conteúdo multi-institucional

Objetivo:

```text
Autorizar conteúdo multi-institucional somente quando o Editor possui acesso a todas as instituições vinculadas.
```

Implementar:

- estender a autorização institucional para múltiplas instituições-alvo;
- permitir acesso global ao papel `ADMIN`;
- exigir de `EDITOR` todas as instituições vinculadas ao conteúdo;
- testar Editor com escopo completo e Editor com escopo parcial.

Não implementar:

- recuperação de senha;
- CSRF e rate limiting;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
Editor somente acessa conteúdo multi-institucional quando possui permissão em todas as instituições vinculadas.
```

## Próximo loop

```text
LOOP 2.11 — CSRF
```
