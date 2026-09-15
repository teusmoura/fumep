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
LOOP 2.9 — ATUAL
```

## Loop atual

### LOOP 2.9 — Testes de permissão simples

Objetivo:

```text
Comprovar por HTTP a autorização institucional simples de um Editor.
```

Implementar:

- criar cenário E2E de Editor vinculado à ETMSL;
- comprovar acesso à ETMSL com HTTP 200;
- comprovar rejeição de acesso ao CRAMAM com HTTP 403;
- executar a cadeia `SessionGuard`, `RoleGuard` e `InstitutionGuard`.

Não implementar:

- conteúdo vinculado a múltiplas instituições;
- recuperação de senha;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
Editor ETMSL recebe HTTP 200 para ETMSL e HTTP 403 para CRAMAM.
```

## Próximo loop

```text
LOOP 2.10 — Conteúdo multi-institucional
```
