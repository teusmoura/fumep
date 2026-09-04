---
name: media-storage
description: Implemente Biblioteca de Mídia, MinIO, uploads, checksum, processamento Sharp, variantes e MediaUsage.
---

# Media Storage

## Invariantes

- arquivo físico no MinIO;
- metadados no PostgreSQL;
- imagem ou PDF como uploads editoriais V1;
- validar extensão + MIME + magic bytes;
- imagem máx. 15 MB;
- PDF máx. 30 MB;
- SHA-256 obrigatório;
- processamento de imagem via BullMQ/Worker;
- WebP + AVIF + thumbnail;
- não fazer upscale;
- mídia em uso não pode ser excluída;
- MinIO interno não pode vazar em URL pública.

## Testes

Cobrir válido, inválido, duplicata, falha de processamento e MediaUsage.
