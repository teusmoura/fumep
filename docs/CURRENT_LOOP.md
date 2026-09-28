# CURRENT LOOP — migração FastAPI + Nuxt

## Estado

- Pilha NestJS/Next.js: loops até 5.30 concluídos; loop 5.31 interrompido sem commit e preservado no stash `b1bba349ce433efb2f4a9b1cb86739a3d004fca8` criado em 2026-09-25.
- Migração aprovada pelo responsável: FastAPI + Nuxt, preservando PostgreSQL, Redis e MinIO.
- Estratégia: aceitar cada funcionalidade isolada antes da integração entre as novas partes.
- MIG 1 — Páginas institucionais Nuxt: concluído, checks verdes (549 testes).
- MIG 2 — API FastAPI básica isolada: concluído, 6 testes Python e HTTP real aprovados.
- MIG 3.1 — Sessão Redis e contrato de cookie: concluído, 17 testes Python incluindo Redis real.
- MIG 3.2 — Política de senha/credenciais Argon2id: concluído, 28 testes Python aprovados.
- MIG 3.3 — Fluxo de login isolado: concluído, 36 testes Python aprovados.
- MIG 3.4 — Autorização institucional e papéis: concluído, 45 testes Python aprovados.
- MIG 3.5 — Contrato CSRF isolado: concluído, 66 testes Python aprovados.
- MIG 3.6 — Logout e leitura de sessão isolados: concluído, 73 testes Python aprovados.
- MIG 3.7 — Rate limiting de login isolado: concluído, 80 testes Python aprovados.
- MIG 3.8 — Contrato de recuperação de senha isolado: concluído, 89 testes Python aprovados.
- Contratos HTTP de autenticação: adiados para MIG 6, fase de integração, conforme estratégia canônica; não declarados concluídos.
- MIG 4.1 — Modelo isolado de metadados da Biblioteca: concluído, 119 testes Python aprovados.
- **MIG 4.2 — Validação isolada de imagem para upload: próximo após commit de MIG 4.1.**

## MIG 4.2 — Validação isolada de imagem para upload

Implementar validação isolada dos bytes e metadados de imagem antes de qualquer upload: formatos JPEG, PNG, WebP e AVIF; extensão, MIME declarado, assinatura real/magic bytes, limite de 15 MB, nome original seguro e rejeição de SVG/outros tipos. Calcular SHA-256 sobre os bytes validados. Usar biblioteca/adaptador Python somente se necessário e documentar decisão; manter sem endpoint, MinIO, PostgreSQL, Worker, variantes ou UI.

Aceite: arquivos válidos de formatos permitidos são aceitos com hash correto; extensão/MIME/magic bytes discordantes, SVG e tamanho excedido são rejeitados; testes e checks verdes, status atualizado e commit criado. Não afirmar armazenamento ou processamento de imagem.

## Próximo loop

**MIG 4.3 — Contrato isolado de upload/armazenamento MinIO.** Detalhar após aceite de MIG 4.2, sem antecipar persistência PostgreSQL.
