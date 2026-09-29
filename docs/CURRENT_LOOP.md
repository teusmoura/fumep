# CURRENT LOOP — migração FastAPI + Nuxt

## Estado

- Pilha NestJS/Next.js: loops até 5.30 concluídos; loop 5.31 interrompido sem commit e preservado no stash `b1bba349ce433efb2f4a9b1cb86739a3d004fca8` criado em 2026-09-25.
- Migração aprovada pelo responsável: FastAPI + Nuxt, preservando PostgreSQL, Redis e MinIO.
- Estratégia: aceitar cada funcionalidade isolada antes da integração entre as novas partes.
- MIG 1, MIG 2 e MIG 3.1–3.8: funcionalidades isoladas concluídas; evidências em `docs/LOOP_STATUS.md`.
- Contratos HTTP de autenticação: adiados para MIG 6, fase de integração, conforme estratégia canônica; não declarados concluídos.
- MIG 4.1 — Metadados isolados da Biblioteca: concluído em `30639aa`.
- MIG 4.2 — Validação isolada de imagem: concluído, 151 testes Python aprovados e 1 integração Redis opcional ignorada.
- **MIG 4.3 — Contrato isolado de armazenamento MinIO: loop atual.**

## MIG 4.3 — Contrato isolado de armazenamento MinIO

Implementar adaptador Python isolado para guardar, ler e remover o original no MinIO privado, usando chave interna gerada e relativa, sem expor URL ou credenciais ao navegador. Reutilizar a validação MIG 4.2 antes da gravação. Decidir e documentar o cliente Python MinIO nesta funcionalidade. Manter sem endpoint, PostgreSQL, Worker, variantes ou UI; não afirmar upload editorial integrado.

Aceite: bytes validados podem ser gravados e lidos sem alteração, com chave segura; rejeições não geram objeto; remoção atua apenas na chave solicitada; falhas do storage são propagadas sem sucesso fictício; testes/checks aplicáveis verdes, status atualizado e commit criado.

## Próximo loop

**MIG 4.4 — Próxima subfuncionalidade da Biblioteca.** Detalhar após aceite de MIG 4.3, conforme sequência da migração, sem antecipar integração ou persistência PostgreSQL.
