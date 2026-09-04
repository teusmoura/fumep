# CURRENT LOOP

## Estado

```text
LOOP 0.1 — CONCLUÍDO
LOOP 0.2 — ATUAL
```

## Loop atual

### LOOP 0.2 — Configurar pnpm workspace

Objetivo:

```text
Configurar o workspace pnpm na raiz do monorepo.
```

Implementar:

- `pnpm-workspace.yaml`;
- `package.json` raiz;
- scripts comuns mínimos compatíveis com o estágio atual.

Não implementar:

- Next.js;
- NestJS;
- Worker funcional;
- Drizzle;
- Docker;
- banco;
- lint complexo;
- Design System.

Critério de aceite:

```bash
pnpm install
```

deve executar sem erros.

## Próximo loop

```text
LOOP 0.3 — Configurar TypeScript central
```
