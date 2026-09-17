# Schema comum dos blocos

Loop 5.2: @fumep/validation exporta contentBlockCommonSchema, contentBlockTypeSchema, contentBlockBackgroundSchema e tipos inferidos. O contrato comum possui id UUID; type entre os 23 identificadores canônicos V1; position INTEGER não negativo; isVisible boolean explícito; schemaVersion INTEGER positivo obrigatório; background DEFAULT/LIGHT/INSTITUTION/IMAGE; anchor nullable/opcional, slug lowercase até 100 caracteres; backgroundMediaId UUID nullable/opcional.

IMAGE exige backgroundMediaId não nulo, conforme §34 do documento especializado PAGE_BUILDER_CONTENT_BLOCKS.md, que tem precedência sobre a lista resumida do plano. Referência é Media.id, nunca URL física/MinIO. Zod valida formato; existência, disponibilidade, tipo da mídia, autorização e MediaUsage pertencem aos consumidores backend de seus loops. Não houve migration ou alteração da persistência existente.

Campos obrigatórios não recebem defaults silenciosos nem coerção de strings. Position/schemaVersion respeitam o limite INTEGER PostgreSQL. Anchor inválido/vazio é rejeitado em vez de normalização implícita; ausência pode ser null/undefined. Unicidade de anchor e posição dentro do proprietário depende de operações backend futuras e não é prometida por um schema de um único bloco.

O objeto é strict: não aceita CSS, grid, HTML, layout livre, URL de fundo, ownerId ou data ainda sem contrato. Schemas específicos futuros usam safeExtend para adicionar data/type/versão específicos preservando refinamentos comuns. O catálogo enum não registra nem implementa blocos; BlockRegistry de produção permanece vazio. Não há editor, renderer, endpoint, preview ou publicação neste loop.

Testes cobrem catálogo e campos válidos, versão/identidade/inteiros/boolean sem coerção, fundos controlados/IMAGE+UUID, anchors, rejeição de propriedades extras e safeExtend mantendo refinamentos/strictness. Infraestrutura pura sem interface nova: acessibilidade/browser E2E não se aplicam ao código novo; os checks disponíveis do projeto continuam obrigatórios.
