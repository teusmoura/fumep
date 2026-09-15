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
LOOP 1.10 — ATUAL
```

## Loop atual

### LOOP 1.10 — Redirect

Objetivo:

```text
Criar a tabela simples de redirecionamentos futuros.
```

Implementar:

- criar a tabela `redirects`;
- implementar `id`, `source_path`, `target_path`, `status_code` e `created_at`;
- garantir origem única e status padrão 301;
- restringir status a 301, 302, 307 ou 308;
- testar a estrutura simples e suas constraints.

Não implementar:

- resolução HTTP de redirects;
- geração automática a partir de alterações de slug;
- endpoints ou interface administrativa;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
Redirect armazena uma origem única, destino e código HTTP válido.
```

## Próximo loop

```text
LOOP 2.1 — Argon2id
```
