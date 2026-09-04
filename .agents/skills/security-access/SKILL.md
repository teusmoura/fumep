---
name: security-access
description: Implemente autenticação, sessão Redis, guards, CSRF, recuperação de senha e autorização institucional do Portal FUMEP.
---

# Security Access

## Invariantes

- sem JWT;
- sessão server-side;
- cookie HttpOnly;
- Secure em produção;
- SameSite=Lax;
- Argon2id;
- senha mínima 10 caracteres;
- ADMIN global;
- EDITOR limitado às instituições;
- conteúdo multi-institucional exige acesso a todas as instituições;
- autorização backend;
- CSRF em mutações;
- reset invalida sessões.

## Testes críticos

- Editor ETMSL não acessa CRAMAM;
- Editor parcial não edita conteúdo multi-institucional;
- ADMIN acessa globalmente;
- token de reset expirado/usado falha;
- respostas de forgot-password são neutras.
