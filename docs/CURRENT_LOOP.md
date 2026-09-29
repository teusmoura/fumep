# CURRENT LOOP — migração FastAPI + Nuxt

## Estado

- Pilha NestJS/Next.js: loops até 5.30 concluídos; loop 5.31 interrompido sem commit e preservado no stash `b1bba349ce433efb2f4a9b1cb86739a3d004fca8` criado em 2026-09-25.
- Migração aprovada pelo responsável: FastAPI + Nuxt, preservando PostgreSQL, Redis e MinIO.
- Estratégia: aceitar cada funcionalidade isolada antes da integração entre as novas partes.
- MIG 1, MIG 2 e MIG 3.1–3.8: funcionalidades isoladas concluídas; evidências em `docs/LOOP_STATUS.md`.
- Contratos HTTP de autenticação: adiados para MIG 6, fase de integração, conforme estratégia canônica; não declarados concluídos.
- MIG 4.1 — Metadados isolados da Biblioteca: concluído em `30639aa`.
- MIG 4.2 — Validação isolada de imagem: concluído, 151 testes Python aprovados e 1 integração Redis opcional ignorada.
- MIG 4.3 — Armazenamento isolado MinIO: concluído, inclusive teste com MinIO real; evidências em `docs/LOOP_STATUS.md`.
- MIG 4.4 — Categorias isoladas da Biblioteca: concluído, 174 testes Python aprovados e 2 integrações opcionais ignoradas.
- MIG 4.5 — Duplicidade/seleção isoladas: concluído, 191 testes Python aprovados e 2 integrações opcionais ignoradas.
- MIG 4.6 — Validação e armazenamento PDF isolados: concluído, 220 testes Python aprovados, integração MinIO real aprovada e 1 integração Redis opcional ignorada.
- **MIG 4.7 — Contrato isolado de fila de mídia Python: loop atual.**

## MIG 4.7 — Contrato isolado de fila de mídia Python

Escolher e registrar o adaptador Python de fila sobre Redis antes de implementá-lo. Entregar somente o contrato isolado de publicação de `PROCESS_MEDIA` com payload mínimo e ID estável, retries/backoff limitados, namespace próprio, retenção configurada e fechamento de conexão. Testar configuração, publicação, duplicata, falhas e lifecycle contra Redis real quando disponível. Preservar a regra de que a publicação futura ocorrerá apenas após a persistência de Media; este loop não conecta upload ou banco.

Aceite: contrato e escolha do adaptador documentados; publicação isolada é idempotente para o mesmo mediaId e não perde erros Redis; retries e fechamento são verificáveis; testes/checks verdes, status atualizado e commit criado. Sem consumidor/Worker, processamento de imagem, variantes, endpoint, PostgreSQL ou UI.

## Próximo loop

**MIG 4.8 — Recepção isolada de PROCESS_MEDIA no Worker Python.** Detalhar após aceite de MIG 4.7; não antecipar processamento/variantes nem integração entre Nuxt, FastAPI e PostgreSQL.
