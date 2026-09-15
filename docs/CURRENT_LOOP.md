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
LOOP 2.8 — ATUAL
```

## Loop atual

### LOOP 2.8 — InstitutionGuard

Objetivo:

```text
Validar o escopo institucional de requisições administrativas autenticadas.
```

Implementar:

- implementar `InstitutionGuard` no NestJS;
- obter da requisição a instituição-alvo do recurso;
- permitir acesso global ao papel `ADMIN`;
- limitar `EDITOR` às instituições presentes na sessão;
- manter a autorização exclusivamente no backend.

Não implementar:

- conteúdo vinculado a múltiplas instituições;
- matriz ampliada de testes de permissão do próximo loop;
- recuperação de senha;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
Guard institucional permite somente acesso compatível com o escopo da identidade autenticada.
```

## Próximo loop

```text
LOOP 2.9 — Testes de permissão simples
```
