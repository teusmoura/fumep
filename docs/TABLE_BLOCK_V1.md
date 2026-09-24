# TABLE v1 — bloco de tabela estruturada

Loop 5.23. Disponível em PAGE e ARTICLE; o contrato é `data: { caption?, headers[], rows[][] }` com `schemaVersion: 1`. Há de 1 a 12 cabeçalhos não vazios e de 1 a 100 linhas; cada linha tem exatamente uma célula por cabeçalho. Legenda: até 300 caracteres; cabeçalho: até 200; célula: até 5.000. As células podem ser vazias, mas contêm apenas texto puro. Caracteres de controle são rejeitados. Chaves extras, HTML arbitrário e versões desconhecidas falham na validação.

O editor Client mantém um draft local e permite editar legenda/cabeçalhos/células, adicionar/remover colunas e linhas e reordenar linhas, preservando a matriz retangular. O callback `onApply` recebe uma cópia validada; falha ou callback concorrente não perde as alterações. O caller continua responsável pela autorização, persistência e publicação.

O renderer SSR falha fechado para dados inválidos/ocultos e emite `<table>`, `<caption>` quando presente, `<thead>`, `<th scope="col">` e `<tbody>`. Sem legenda, a região rolável recebe nome acessível genérico. A rolagem horizontal é local e alcançável pelo teclado. O React escapa conteúdo; não há interpretação de HTML/CSS. Fundo e tema seguem o contrato compartilhado `BlockBackground`.

Não há endpoint, migration, Preview, publicação nem indexação antecipados neste loop.
