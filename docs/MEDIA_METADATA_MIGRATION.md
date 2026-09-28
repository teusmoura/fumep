# Metadados isolados da Biblioteca — MIG 4.1

`apps/backend/app/media_metadata.py` define `MediaMetadata` interno estrito (tipos IMAGE/DOCUMENT/VIDEO/OTHER, nomes, MIME, tamanho, storage key relativo, SHA-256, dimensões, texto alternativo/legenda, status de processamento/exclusão, categoria, autoria e data com fuso). O contrato valida tamanho não negativo, dimensões positivas, checksum hexadecimal minúsculo, nomes internos seguros e chave relativa cujo basename coincide com o nome gerado. Isso **não** calcula checksum, valida bytes de upload, cria tabela ou acessa MinIO.

`to_public_metadata` projeta apenas ID, tipo, MIME, dimensões e metadados de acessibilidade/legenda, sem nome original, chave interna, checksum, autoria ou erro operacional. Falha fechado para mídia não `READY` ou com `deletion_status` diferente de `NONE`. Imagem decorativa não leva texto alternativo à projeção. URL pública será resolvida posteriormente pelo domínio do portal; nenhuma URL MinIO é derivada deste modelo.

O modelo lógico §8.2 e Storage §21 fundamentam os campos; `OTHER` consta no documento especializado e no enum do schema legado. O contrato não equivale ao mapeamento PostgreSQL nem prova paridade de dados existentes. A escolha ORM/migrations e essa validação ficam para MIG 6.
