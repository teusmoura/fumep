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
LOOP 2.10 — CONCLUÍDO
LOOP 2.11 — ATUAL
```

## Loop atual

### LOOP 2.11 — CSRF

Objetivo:

```text
Proteger métodos mutáveis autenticados contra requisições forjadas entre sites.
```

Implementar:

- implementar proteção CSRF para `POST`, `PUT`, `PATCH` e `DELETE` autenticados;
- validar token CSRF associado à sessão;
- validar `Origin` ou `Referer` permitido;
- preservar `SameSite=Lax` no cookie de sessão;
- testar requisições válidas e rejeitadas.

Não implementar:

- rate limiting;
- recuperação de senha;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
Métodos mutáveis autenticados rejeitam requisições sem token CSRF válido ou origem permitida.
```

## Próximo loop

```text
LOOP 2.12 — Rate limiting de login
```
