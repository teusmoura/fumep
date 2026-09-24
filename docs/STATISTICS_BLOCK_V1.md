# STATISTICS v1 — indicadores estruturados

Loop 5.25. Disponível somente em PAGE com `schemaVersion: 1` e `data: { items[] }`. Cada item contém `value`, `label` e `description?`. O valor é texto controlado para permitir unidades, porcentagens e formatação editorial (`98%`, `1,2 mil`), sem cálculo ou animação obrigatória. Limite canônico: 1–12 indicadores. Valor até 120 caracteres, rótulo até 200, descrição até 2.000. Valor/rótulo não podem ser só espaços. Tudo é texto puro; chaves extras, HTML/CSS arbitrário e versões desconhecidas falham na validação.

O editor Client permite adicionar, editar, remover e reordenar indicadores. Valida o conjunto antes de `onApply`, envia uma cópia isolada e conserva o draft quando o callback falha. O caller continua responsável por autorização, persistência e publicação.

O renderer SSR usa seção nomeada e lista semântica responsiva, sem animação ou dependência de JavaScript público. React escapa o conteúdo; blocos ocultos/inválidos falham fechado. Fundo/tema seguem `BlockBackground` e tokens do Design System.

Sem endpoint, migration, Preview, publicação ou indexação antecipados.
