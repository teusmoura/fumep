# HERO v1

O contrato `heroBlockDataSchemaV1` permite somente title obrigatório/não vazio, description opcional, imageId UUID opcional, imageAlt e button opcional com label não vazio e URL segura. O envelope `heroBlockSchemaV1` compõe o contrato comum com type HERO/schemaVersion 1. A imagem é opcional conforme exemplo canônico §8; quando presente, é sempre uma referência Media.id, nunca URL física, vídeo ou HTML.

Imagem exige alt explícito: texto não branco identifica imagem informativa, string exatamente vazia declara decoração. Alt sem imagem é rejeitado, evitando configuração órfã. Não existe flag decorative duplicando essa decisão. O editor/renderer do 5.7 deverá deixar essa escolha evidente e validar alt/CTA, sem inferir decoração de alt ausente.

`HERO_V1_LIMITS`: title 200, description 2000, alt 300, label CTA 120 caracteres. Controles inseguros são proibidos, objetos strict recusam atributos livres e CTA reutiliza a whitelist HTTP(S) sem credenciais, paths root-relative e anchors do TEXT v1. Strings contendo markup são texto literal; o renderer futuro deve usar escaping React, nunca interpretar HTML.

O schema não consulta banco/storage: existência, tipo IMAGE, processamento/disponibilidade/deleção de mídia, MediaUsage e autorização continuam responsabilidades de backend/persistência/publicação nos loops correspondentes. A referência UUID não prova disponibilidade nem autorização. Nenhum editor, renderer, rota, acesso a mídia ou definição incompleta de Registry é entregue no 5.6. TEXT v1 permanece a única definição operacional completa.
