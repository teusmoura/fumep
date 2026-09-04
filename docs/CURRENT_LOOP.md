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
LOOP 0.15 — ATUAL
```

## Loop atual

### LOOP 0.15 — Health básico

Objetivo:

```text
Disponibilizar o health check público mínimo da API.
```

Implementar:

- `GET /api/v1/health`;
- resposta pública `{ "status": "ok" }`.

Não implementar:

- detalhes de serviços internos;
- credenciais, versões ou topologia;
- health administrativo detalhado.

Critério de aceite:

```text
Endpoint não expõe detalhes internos.
```

## Próximo loop

```text
LOOP 0.16 — GitHub Actions CI inicial
```
