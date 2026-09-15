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
LOOP 2.6 — ATUAL
```

## Loop atual

### LOOP 2.6 — SessionGuard

Objetivo:

```text
Proteger endpoints autenticados por meio da sessão server-side.
```

Implementar:

- implementar `SessionGuard` no NestJS;
- ler o cookie `fumep_session`;
- localizar e validar a sessão no Redis;
- disponibilizar a identidade autenticada à requisição;
- proteger um endpoint autenticado e testar acesso válido e inválido.

Não implementar:

- `RoleGuard`;
- `InstitutionGuard`;
- recuperação de senha;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
Endpoint protegido aceita sessão válida e rejeita sessão ausente ou inválida.
```

## Próximo loop

```text
LOOP 2.7 — RoleGuard
```
