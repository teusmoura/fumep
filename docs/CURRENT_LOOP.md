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
- MIG 4.7 — Publicação isolada de PROCESS_MEDIA em Redis: concluído, 228 testes Python aprovados com Redis e MinIO reais.
- **MIG 4.8 — Worker Python recebe e verifica original de imagem isoladamente: loop atual.**

## MIG 4.8 — Worker Python recebe e verifica original de imagem isoladamente

Criar o consumidor Python separado da API para `PROCESS_MEDIA` usando RQ/JSON e o agendador de retries. Com repositório de leitura injetado (fixture nos testes), o Worker reconsulta a mídia por ID, lê o original privado no MinIO, verifica tamanho/checksum e decodifica dimensões e orientação com adaptador Python escolhido e documentado. Falhar com segurança em mídia ausente/corrompida, storage indisponível ou payload inválido. Testar recepção real em Redis e original real no MinIO sem introduzir persistência PostgreSQL nesta fatia.

Aceite: job é recebido por Worker separado, original válido é revalidado e suas dimensões são obtidas; repetição não modifica o original; falhas são observáveis e o processo fecha conexões; testes/checks verdes, status atualizado e commit criado. Sem variantes, estado READY, escrita PostgreSQL, endpoint ou UI.

## Próximo loop

**MIG 4.9 — Variantes responsivas isoladas.** Detalhar após aceite de MIG 4.8; não antecipar integração entre Nuxt, FastAPI e PostgreSQL.
