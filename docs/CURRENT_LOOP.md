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
LOOP 1.6 — ATUAL
```

## Loop atual

### LOOP 1.6 — Regra Page N:1 Institution

Objetivo:

```text
Completar Page com a relação obrigatória N:1 com Institution.
```

Implementar:

- adicionar `institution_id UUID NOT NULL` à tabela `pages`;
- criar chave estrangeira para `institutions`;
- garantir `UNIQUE(institution_id, slug)`;
- testar que instituições distintas podem repetir slug e uma instituição não pode.

Não implementar:

- tabela associativa `PageInstitution` ou qualquer relação N:N para páginas;
- campos adicionais ou funcionalidades dos próximos loops.

Critério de aceite:

```text
Cada página pertence a exatamente uma instituição e o slug é único dentro dela.
```

## Próximo loop

```text
LOOP 1.7 — ContentBlock
```
