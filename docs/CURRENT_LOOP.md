# CURRENT LOOP

## Estado

```text
LOOP 0.1 — CONCLUÍDO
LOOP 0.2 — CONCLUÍDO
LOOP 0.3 — ATUAL
```

## Loop atual

### LOOP 0.3 — Configurar TypeScript central

Objetivo:

```text
Configurar TypeScript central no workspace.
```

Implementar:

- `tsconfig.base.json`;
- strict mode;
- aliases básicos.

Não implementar:

- aplicações funcionais;
- frameworks dos loops seguintes;
- regras de lint complexas.

Critério de aceite:

```bash
pnpm typecheck
```

deve funcionar no workspace.

## Próximo loop

```text
LOOP 0.4 — Configurar lint e formatter
```
