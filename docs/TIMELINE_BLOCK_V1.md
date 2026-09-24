# TIMELINE v1 — linha do tempo estruturada

Loop 5.24. Disponível somente em PAGE com `schemaVersion: 1` e `data: { title?, items[] }`. Cada item contém `date?`, `title` e `description`. A data é um rótulo textual opcional (pode representar ano, intervalo ou período), não um valor ISO inventado; a ordem da lista define a sequência editorial. Limite local defensivo: 1–30 marcos. Título do bloco/item até 200 caracteres, data até 120 e descrição até 2.000. Campos obrigatórios não podem ser só espaços. Conteúdo é texto puro, sem HTML/CSS livre ou blocos aninhados.

O editor Client permite adicionar, editar, remover e reordenar marcos. Valida o conjunto antes de `onApply`, envia cópia isolada e conserva o draft quando o callback falha. O caller segue responsável por autorização, persistência e publicação.

O renderer SSR usa seção nomeada, título h2 opcional e lista ordenada de marcos com títulos h3. O rótulo de data e a descrição são texto escapado. Blocos ocultos, inválidos ou em versão desconhecida falham fechado. Fundo/tema são resolvidos por `BlockBackground`; layout e foco são do Design System.

Sem endpoint, migration, Preview, publicação ou indexação antecipados.
