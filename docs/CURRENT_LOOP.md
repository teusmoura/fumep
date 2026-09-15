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
LOOP 2.1 — ATUAL
```

## Loop atual

### LOOP 2.1 — Argon2id

Objetivo:

```text
Implementar hash e verificação segura de senhas com Argon2id.
```

Implementar:

- criar um serviço de hash de senha com Argon2id;
- implementar geração e verificação de hash;
- garantir que o hash nunca seja igual à senha em texto;
- testar senha válida e inválida.

Não implementar:

- login, sessão Redis ou cookies;
- recuperação de senha;
- guards, autorização ou endpoints;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
Senha é armazenável como hash Argon2id e pode ser verificada sem expor o texto original.
```

## Próximo loop

```text
LOOP 2.2 — Login
```
