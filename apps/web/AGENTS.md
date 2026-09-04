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
