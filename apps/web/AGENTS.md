# AGENTS.md — apps/web

Escopo: frontend Next.js público e painel administrativo.

## Regras
- Usar componentes compartilhados e Design System.
- Não criar componentes institucionais duplicados quando ThemeContext resolver a variação.
- SSR/server rendering como padrão para conteúdo público.
- Client Components apenas quando houver interação real.
- Preservar acessibilidade por teclado e `focus-visible`.
- Implementar dark mode sem FOUC.
- Não acessar banco diretamente; usar API/contratos definidos.
- Não inventar endpoints.
- Não introduzir estado global desnecessário.
- Respeitar `docs/architecture/FRONTEND_DESIGN_SYSTEM_TEMAS.md`.

## Validação
Executar os checks disponíveis e testes do frontend afetado.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
