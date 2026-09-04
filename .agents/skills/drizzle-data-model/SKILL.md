---
name: drizzle-data-model
description: Implemente ou revise schema, migrations, constraints, índices e repositories Drizzle do Portal FUMEP.
---

# Drizzle Data Model

1. Leia o modelo lógico canônico.
2. Confirme que a entidade pertence ao loop atual.
3. Preserve UUID, TIMESTAMPTZ e snake_case.
4. Crie constraints e índices definidos.
5. Não introduza tabela de conveniência não prevista sem necessidade.
6. Teste migration em banco limpo quando a infraestrutura existir.
7. Teste repository.
8. Prefira migration aditiva e compatível.

Regras críticas:
- `Page` N:1 `Institution`;
- `Article` e `Event` podem ser N:N;
- sem `analytics_events` de navegação;
- SearchDocument é derivado/reconstruível.
