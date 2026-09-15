# LOOP STATUS

## LOOP 0.1 — Concluído

Implementado:
- estrutura `apps/`;
- estrutura `packages/`;
- estrutura `infra/`;
- estrutura `docs/`;
- estrutura `.github/`;
- README;
- `.gitignore`;
- Git inicial.

Commit original:
```text
chore: initialize portal fumep monorepo
```

## LOOP 0.2 — Concluído

Escopo atual:
- configurar `pnpm-workspace.yaml` para `apps/*` e `packages/*`;
- criar o `package.json` privado da raiz;
- disponibilizar scripts comuns mínimos que tolerem pacotes ainda vazios;
- validar a instalação sem antecipar ferramentas dos loops seguintes.

Implementado:
- `pnpm-workspace.yaml` cobrindo `apps/*` e `packages/*`;
- `package.json` raiz privado com scripts comuns mínimos;
- `pnpm-lock.yaml` gerado pela instalação;
- `.pnpm-store/` ignorado pelo Git.

Ambiente observado:
- Node.js `v24.20.0`;
- pnpm `11.19.0`.

Checks executados com sucesso:
- `pnpm install`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm build`.

Observação:
- os scripts comuns concluíram sem erros e informaram que ainda não há projetos com scripts próprios, comportamento esperado neste estágio.

Commit:
```text
chore: configure pnpm workspace
```

## LOOP 0.3 — Concluído

Escopo atual:
- criar `tsconfig.base.json` na raiz;
- habilitar modo estrito;
- definir alias básico para os pacotes `@fumep/*`;
- disponibilizar e validar `pnpm typecheck` sem criar aplicações ou configurar lint.

Implementado:
- `tsconfig.base.json` central com alvo ES2022, resolução de módulos para bundlers e emissão desabilitada;
- modo estrito habilitado;
- alias `@fumep/*` direcionado aos fontes dos pacotes do workspace;
- declaração sentinela neutra para validar a configuração antes da criação das aplicações;
- TypeScript `7.0.2` como dependência de desenvolvimento da raiz;
- script raiz `typecheck` executando o compilador com a configuração central.

Checks executados com sucesso:
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm test`;
- `pnpm build`;
- `pnpm install --frozen-lockfile`;
- `git diff --check`.

Observação:
- lint, testes e build ainda não encontram projetos com scripts próprios, comportamento esperado antes da criação das aplicações.

Commit:
```text
chore: configure central typescript
```

## LOOP 0.4 — Concluído

Escopo atual:
- criar o pacote mínimo `apps/web` com Next.js e App Router;
- fornecer layout, página padrão e estilos globais mínimos;
- manter renderização no servidor e HTML semântico;
- validar que a página abre localmente, sem antecipar Design System, temas ou integrações.

Implementado:
- pacote privado `@fumep/web` com Next.js `16.3.4`, React `19.2.8` e App Router;
- layout raiz em português do Brasil com metadados mínimos;
- página inicial renderizada no servidor com HTML semântico;
- estilos globais mínimos, incluindo skip link com foco visível;
- configuração TypeScript estendendo a base central;
- scripts `dev`, `build`, `start` e `typecheck` do frontend;
- script raiz `typecheck` ampliado para validar os projetos do workspace;
- regras locais do agente geradas e mantidas pelo Next.js 16;
- artefatos gerados do TypeScript e `next-env.d.ts` ignorados pelo Git.

Checks executados com sucesso:
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm test`;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `git diff --check`.

Critério de aceite validado:
- servidor de desenvolvimento iniciado em `http://127.0.0.1:3100`;
- `GET /` respondeu HTTP `200`;
- resposta continha `<title>Portal FUMEP</title>`, `<h1>Portal FUMEP</h1>` e `main-content`.

Commit:
```text
feat(web): create minimal nextjs app
```

## LOOP 0.5 — Concluído

Escopo atual:
- criar o pacote mínimo `apps/api` com NestJS;
- expor `GET /api/v1/health` por controller fino e service dedicado;
- documentar o endpoint no contrato OpenAPI;
- validar o endpoint com Vitest e Supertest;
- não criar domínio, persistência, autenticação ou integrações.

Implementado:
- pacote privado `@fumep/api` com NestJS `12.0.1` em ESM;
- bootstrap HTTP com prefixo global `/api/v1`;
- endpoint `GET /api/v1/health` com controller fino e service dedicado;
- resposta determinística `{ "status": "ok" }`;
- contrato OpenAPI e Swagger disponíveis em `/api/docs` e `/api/docs-json`;
- teste HTTP com Vitest `5.0.0` e Supertest `7.2.2`;
- build NestJS e configuração TypeScript baseada em `NodeNext`;
- TypeScript central ajustado para `6.0.3`, versão compatível com a API programática exigida pelo Nest CLI 12;
- script transitivo opcional de `@scarf/scarf` explicitamente bloqueado na política pnpm.

Checks executados com sucesso:
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm test` — 1 arquivo e 1 teste aprovados;
- `pnpm build` — API e frontend compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `git diff --check`.

Critério de aceite validado:
- servidor NestJS iniciado localmente na porta `3001`;
- `GET /api/v1/health` respondeu HTTP `200` com `{ "status": "ok" }`;
- `GET /api/docs-json` respondeu HTTP `200` e incluiu `/api/v1/health`.

Commit:
```text
feat(api): create minimal nestjs health endpoint
```

## LOOP 0.6 — Concluído

Escopo atual:
- criar o pacote mínimo `apps/worker` em TypeScript;
- manter o Worker como processo independente da API;
- sinalizar inicialização e suportar encerramento controlado;
- validar que o processo inicia sem erro;
- não instalar ou configurar BullMQ, Redis, filas ou jobs.

Implementado:
- pacote privado `@fumep/worker` como aplicação independente;
- processo Node.js em TypeScript e ESM;
- configuração de typecheck e build baseada no TypeScript central;
- scripts `build`, `start` e `typecheck`;
- sinalização explícita de prontidão;
- manutenção do processo ativo e handlers de encerramento para `SIGINT` e `SIGTERM`;
- somente tipos de Node como dependência de desenvolvimento.

Checks executados com sucesso:
- `pnpm typecheck` — API, web e Worker aprovados;
- `pnpm lint`;
- `pnpm test` — teste existente da API aprovado;
- `pnpm build` — API, web e Worker compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `git diff --check`.

Critério de aceite validado:
- `pnpm --dir apps/worker start` iniciou o artefato compilado sem erro;
- processo emitiu `Worker FUMEP iniciado.` e permaneceu ativo;
- processo de validação encerrado após a comprovação.

Observação:
- nenhum teste específico de jobs foi criado porque BullMQ e jobs estão explicitamente fora deste loop.

Commit:
```text
feat(worker): create minimal typescript worker
```

## LOOP 0.7 — Concluído

Escopo atual:
- criar o pacote mínimo `packages/db` preparado para Drizzle ORM;
- expor uma entrada TypeScript/ESM sem schema, migration ou conexão;
- declarar o pacote como dependência workspace da API;
- validar a importação de `@fumep/db` pela API em tempo de compilação.

Implementado:
- pacote privado ESM `@fumep/db` com entrada pública e artefatos em `dist`;
- configuração TypeScript e build baseada no padrão central;
- Drizzle ORM `0.45.2` como dependência de runtime do pacote;
- marcador de tipo mínimo exportado, sem representar entidade de domínio;
- dependência workspace `@fumep/db` declarada em `apps/api`;
- importação de tipo pela API para validar resolução e contrato entre pacotes.

Checks executados com sucesso:
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm typecheck` — db, API, web e Worker aprovados;
- `pnpm lint`;
- `pnpm test` — teste existente da API aprovado;
- `pnpm build` — pacote db e aplicações compilados em ordem topológica;
- `git diff --check`.

Critério de aceite validado:
- vínculo workspace `apps/api/node_modules/@fumep/db` aponta para `packages/db`;
- API compilou com importação de tipo de `@fumep/db`;
- importação ESM do artefato compilado a partir de `apps/api` retornou `DB_IMPORT=ok`.

Observação:
- nenhum schema, migration, repository ou conexão com PostgreSQL foi criado neste loop.

Commit:
```text
feat(db): prepare drizzle package
```

## LOOP 0.8 — Concluído

Escopo atual:
- criar o pacote mínimo `packages/validation` com Zod;
- definir somente o schema da resposta de health já existente;
- testar payloads válido e inválido;
- consumir o tipo inferido pelo schema em `apps/api` e `apps/web`;
- não antecipar schemas completos de domínio ou ContentBlocks.

Implementado:
- pacote privado ESM `@fumep/validation` com Zod `4.5.4`;
- schema estrito `healthResponseSchema` para o contrato existente `{ status: "ok" }`;
- tipo `HealthResponse` inferido diretamente do schema;
- dependência workspace declarada em `apps/api` e `apps/web`;
- API usando o tipo compartilhado em `HealthService`;
- web usando o tipo compartilhado na página inicial;
- build TypeScript e entrada pública do pacote.

Testes adicionados:
- payload `{ status: "ok" }` é aceito;
- status inválido é rejeitado.

Checks executados com sucesso:
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm typecheck` — validation, db, API, web e Worker aprovados;
- `pnpm lint`;
- `pnpm test` — 2 testes do schema e 1 teste da API aprovados;
- `pnpm build` — pacote de validação e aplicações compilados;
- `git diff --check`.

Critério de aceite validado:
- importação runtime do schema a partir de `apps/api` retornou `API_SCHEMA=ok`;
- importação runtime do mesmo schema a partir de `apps/web` retornou `WEB_SCHEMA=ok`.

Observação:
- nenhum schema completo de domínio ou ContentBlock foi criado.

Commit:
```text
feat(validation): add shared health schema
```

## LOOP 0.9 — Concluído

Escopo atual:
- criar o pacote mínimo `packages/ui` para React;
- expor um componente apresentacional simples e server-compatible;
- declarar o pacote como dependência workspace da web;
- renderizar o componente na página inicial do Next.js;
- não antecipar Design System completo, temas, tokens ou componentes interativos.

Implementado:
- pacote privado ESM `@fumep/ui` para componentes React compartilhados;
- componente apresentacional `Message`, sem estado ou dependência de cliente;
- configuração TypeScript voltada a bundlers e build com declarações;
- React como peer dependency e tipos React para compilação isolada;
- dependência workspace `@fumep/ui` declarada no app web;
- parágrafo da home renderizado pelo componente compartilhado.

Checks executados com sucesso:
- `pnpm typecheck` — UI, validation, db, API, web e Worker aprovados;
- `pnpm lint`;
- `pnpm test` — 3 testes existentes aprovados;
- `pnpm build` — pacote UI e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `git diff --check`.

Critério de aceite validado:
- servidor Next.js iniciado localmente;
- `GET /` respondeu HTTP `200`;
- HTML continha `<p>Projeto institucional em construção.</p>` renderizado por `Message`.

Observação:
- uma porta ocupada por servidor de validação anterior foi identificada e o processo correspondente foi encerrado antes da prova final;
- nenhum Design System completo, tema, token ou componente interativo foi criado.

Commit:
```text
feat(ui): add shared message component
```

## LOOP 0.10 — Concluído

Escopo atual:
- configurar ESLint flat config na raiz para TypeScript e Next.js;
- adotar Prettier como formatter comum;
- adicionar scripts raiz de lint, correção e formatação;
- formatar e validar somente código/configuração do workspace;
- não antecipar regras específicas de funcionalidades futuras.

Implementado:
- configuração ESLint flat na raiz com regras recomendadas de Next.js, TypeScript e compatibilidade com Prettier;
- Prettier adotado como formatter comum, com configuração e exclusões explícitas;
- scripts raiz `lint`, `lint:fix`, `format` e `format:check`;
- arquivos existentes normalizados pelo formatter e import não utilizado removido;
- builds opcionais de dependências nativas não necessárias mantidos desabilitados pelo pnpm.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck` — UI, validation, db, API, web e Worker aprovados;
- `pnpm test` — 2 testes do schema e 1 teste da API aprovados;
- `pnpm build` — pacotes e aplicações compilados, incluindo build estático do Next.js;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check` — nenhuma incompatibilidade de peer dependency;
- `git diff --check`.

Critério de aceite validado:
- `pnpm lint` concluído sem erros ou avisos.

Observação:
- nenhuma regra específica de funcionalidades futuras foi adicionada.

Commit:
```text
chore: configure lint and formatter
```

## LOOP 0.11 — Concluído

Escopo atual:
- criar o primeiro `docker-compose.dev.yml`;
- adicionar somente PostgreSQL, Redis e MinIO;
- limitar portas publicadas ao host local de desenvolvimento;
- manter credenciais reais fora do Git;
- não antecipar volumes, healthchecks, persistência ou bucket inicial dos loops 0.12 a 0.14.

Implementado:
- composição de desenvolvimento nomeada `portal-fumep-dev`;
- PostgreSQL 17, Redis 8 e MinIO com versão explícita;
- credenciais parametrizadas por variáveis obrigatórias, documentadas em `.env.example`;
- portas publicadas exclusivamente em `127.0.0.1` para uso local;
- arquivo `.env` local ignorado pelo Git para a validação dos containers.

Checks executados com sucesso:
- `docker compose --env-file .env -f docker-compose.dev.yml config --quiet`;
- `docker compose --env-file .env -f docker-compose.dev.yml up -d`;
- inspeção Docker dos três containers;
- logs de inicialização dos três serviços;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `git diff --check`.

Critério de aceite validado:
- `portal-fumep-dev-postgres-1` em estado `running` e aceitando conexões;
- `portal-fumep-dev-redis-1` em estado `running` e aceitando conexões;
- `portal-fumep-dev-minio-1` em estado `running`, com API e console inicializados.

Observação:
- volumes, healthchecks, persistência do Redis e bucket inicial permanecem reservados aos loops seguintes.

Commit:
```text
chore: add development infrastructure compose
```

## LOOP 0.12 — Concluído

Escopo atual:
- adicionar volume persistente ao PostgreSQL;
- adicionar healthcheck nativo com `pg_isready`;
- documentar e consumir `DATABASE_URL`;
- comprovar a conexão a partir do workspace da API com uma consulta mínima;
- não antecipar configuração Drizzle, migrations, schema ou domínio.

Implementado:
- volume nomeado `postgres_data` montado no diretório de dados do PostgreSQL;
- healthcheck com `pg_isready`, usando usuário e banco do ambiente;
- `DATABASE_URL` documentada em `.env.example` e configurada apenas no `.env` local ignorado;
- driver PostgreSQL mínimo no workspace da API;
- comando `db:check` que abre conexão, executa `SELECT 1` e a encerra corretamente.

Checks executados com sucesso:
- validação do Docker Compose;
- `docker compose ... up -d --wait postgres`;
- PostgreSQL confirmado como `healthy`;
- `pnpm --filter @fumep/api db:check`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- a API conectou ao PostgreSQL pela `DATABASE_URL` e executou consulta mínima com sucesso.

Observação:
- a integração com Drizzle e migrations permanece reservada ao loop 1.1.

Commit:
```text
feat(db): add postgres development connection check
```

## LOOP 0.13 — Concluído

Escopo atual:
- exigir senha no Redis de desenvolvimento;
- habilitar persistência AOF em volume nomeado;
- adicionar healthcheck autenticado;
- documentar e consumir `REDIS_URL`;
- comprovar `PING` a partir do workspace da API;
- não antecipar sessões, BullMQ ou cache.

Implementado:
- senha obrigatória do Redis recebida exclusivamente pelo ambiente;
- persistência AOF habilitada em volume nomeado `redis_data`;
- healthcheck autenticado com `redis-cli`;
- `REDIS_URL` documentada em `.env.example` e configurada apenas no `.env` ignorado;
- cliente Redis mínimo e comando `redis:check` no workspace da API.

Checks executados com sucesso:
- validação do Docker Compose;
- `docker compose ... up -d --wait redis`;
- Redis confirmado como `healthy`;
- PING sem senha rejeitado com `NOAUTH`;
- `pnpm --filter @fumep/api redis:check`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- a API conectou ao Redis autenticado e recebeu `PONG`.

Observação:
- sessões, BullMQ e cache permanecem fora deste loop.

Commit:
```text
feat(auth): secure development redis
```

## LOOP 0.14 — Concluído

Escopo atual:
- adicionar volume persistente ao MinIO;
- adicionar healthcheck HTTP nativo;
- criar idempotentemente os buckets canônicos `portal-public` e `portal-private`;
- documentar a configuração de acesso local;
- comprovar acesso a partir do workspace da API;
- não antecipar uploads, processamento ou Biblioteca de Mídia.

Implementado:
- volume nomeado `minio_data` para persistência dos objetos;
- healthcheck HTTP no endpoint interno de saúde do MinIO;
- hook pós-inicialização idempotente com o cliente `mc` já presente na imagem;
- buckets canônicos `portal-public` e `portal-private`;
- configuração local do endpoint documentada em `.env.example`;
- cliente MinIO mínimo e comando `storage:check` no workspace da API.

Checks executados com sucesso:
- validação do Docker Compose;
- `docker compose ... up -d --wait minio`;
- MinIO confirmado como `healthy`;
- listagem dos buckets pelo cliente `mc`;
- `pnpm --filter @fumep/api storage:check`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- a API acessou o MinIO e confirmou os dois buckets iniciais.

Observação:
- uploads, metadados, processamento e Biblioteca de Mídia permanecem fora deste loop.

Commit:
```text
feat(media): initialize development minio storage
```

## LOOP 0.15 — Concluído

Escopo atual:
- auditar o endpoint público `GET /api/v1/health` já criado no bootstrap;
- confirmar resposta estritamente igual a `{ "status": "ok" }`;
- validar contrato compartilhado, documentação OpenAPI e teste Supertest existentes;
- não expor dependências, versões, credenciais ou topologia interna;
- não antecipar health administrativo detalhado.

Implementado/auditado:
- rota pública `GET /api/v1/health` sob o prefixo global da API;
- controller fino delegando ao `HealthService`;
- resposta tipada pelo contrato compartilhado `HealthResponse`;
- documentação OpenAPI com exemplo público mínimo;
- teste Supertest que exige resposta exatamente igual a `{ "status": "ok" }`.

Checks executados com sucesso:
- execução HTTP real em porta isolada: status `200`;
- corpo real exatamente `{"status":"ok"}`;
- `Content-Type: application/json; charset=utf-8`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — contrato e endpoint aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- o corpo estritamente mínimo não contém hostname, versões, credenciais, topologia ou detalhes de dependências.

Observação:
- o endpoint havia sido criado no bootstrap inicial e não precisou de alteração artificial; este loop auditou e comprovou formalmente seu contrato público.

Commit:
```text
docs: validate minimal public health endpoint
```

## LOOP 0.16 — Concluído

Escopo atual:
- criar um workflow único de CI para Pull Requests direcionados à `main`;
- instalar pnpm e Node.js com cache de dependências;
- executar instalação congelada, lint, typecheck, testes e build;
- aplicar permissões mínimas e cancelamento de execuções obsoletas;
- não implementar deploy, publicação de imagens ou branch protection.

Implementado:
- workflow `.github/workflows/ci.yml` acionado em Pull Requests para `main`;
- job único em Ubuntu e Node.js 24, com cache do pnpm;
- pnpm obtido a partir da versão declarada pelo projeto;
- instalação com lockfile congelado;
- etapas separadas de lint, typecheck, testes e build;
- permissões `contents: read`, timeout e cancelamento de execuções obsoletas.

Checks executados com sucesso:
- `pnpm exec prettier --check .github/workflows/ci.yml` — YAML válido e formatado;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `git diff --check`.

Critério de aceite validado:
- o gatilho `pull_request` direcionado à `main` executa o job com toda a sequência canônica da CI.

Observação:
- deploy, imagens e branch protection não foram configurados.

Commit:
```text
ci: add initial pull request checks
```

## LOOP 0.17 — Concluído

Escopo atual:
- configurar a proteção da branch `main` no GitHub;
- exigir o check `Lint, types, tests and build` antes do merge;
- exigir que a branch esteja atualizada antes do merge;
- não adicionar reviews obrigatórios ou outras regras de governança.

Implementado:
- repositório publicado em `https://github.com/teusmoura/fumep`;
- proteção clássica habilitada na branch `main`;
- status check obrigatório `Lint, types, tests and build`;
- política estrita habilitada para exigir branch atualizada;
- force-push e exclusão da branch desabilitados.

Checks executados com sucesso:
- leitura da proteção pela API do GitHub;
- `required_status_checks.strict` confirmado como `true`;
- contexto obrigatório confirmado como `Lint, types, tests and build`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `git diff --check`.

Critério de aceite validado:
- merges na `main` ficam bloqueados enquanto o check obrigatório não for aprovado.

Observação:
- nenhuma exigência adicional de review, assinatura ou histórico linear foi adicionada.

Commit:
```text
docs: record main branch protection
```

## LOOP 1.1 — Concluído

Escopo atual:
- configurar o cliente Drizzle PostgreSQL em `packages/db`;
- adicionar configuração do Drizzle Kit;
- criar schema inicial vazio e diretório versionado de migrations;
- gerar e executar uma migration vazia no banco de desenvolvimento;
- não criar tabelas, dados iniciais ou repositories de domínio.

Implementado:
- cliente Drizzle sobre `postgres-js` exportado por `@fumep/db`;
- schema TypeScript inicial explicitamente vazio;
- `drizzle.config.ts` com dialeto PostgreSQL e carregamento seguro da `DATABASE_URL` local;
- scripts `db:generate` e `db:migrate` no pacote de banco;
- migration custom vazia `0000_initialize.sql` e metadados do Drizzle versionados;
- autorização explícita apenas dos scripts do `esbuild` necessários ao Drizzle Kit.

Checks executados com sucesso:
- `pnpm --filter @fumep/db db:generate` — 0 tabelas e nenhuma alteração adicional;
- `pnpm --filter @fumep/db db:migrate` — migration aplicada com sucesso e reaplicação idempotente;
- PostgreSQL de desenvolvimento confirmado como `healthy`;
- tabela interna `drizzle.__drizzle_migrations` com 1 registro;
- schema `public` confirmado com 0 tabelas;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- a migration vazia foi executada e registrada no banco de desenvolvimento.

Observação:
- nenhuma tabela, entidade, seed ou repository de domínio foi criado.

Commit:
```text
feat(db): configure drizzle migrations
```

## LOOP 1.2 — Concluído

Escopo atual:
- criar a tabela `institutions` somente com os campos essenciais do loop;
- preservar UUID, TIMESTAMPTZ e snake_case;
- implementar repository com create, read, update e delete;
- testar o CRUD contra PostgreSQL isolado;
- preparar a CI para executar migrations e testes de banco;
- não antecipar tema, settings, mídia ou outras entidades.

Implementado:
- tabela `institutions` com UUID gerado no banco, `name`, `slug` único, `is_active` e timestamps com fuso;
- migration aditiva `0001_sudden_juggernaut.sql` gerada pelo Drizzle Kit;
- tipos inferidos `Institution` e `NewInstitution`;
- `InstitutionRepository` com criação, consulta por id, listagem ordenada, atualização e exclusão;
- teste de integração cobrindo o ciclo CRUD e exclusão inexistente;
- serviço PostgreSQL efêmero e etapa de migration adicionados à CI antes dos testes.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_2_test`;
- `pnpm --filter @fumep/db test` — CRUD aprovado em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 4 testes aprovados entre validation, db e API;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- repository criou, leu, listou, atualizou e excluiu uma instituição em PostgreSQL real.

Observação:
- nenhum campo de tema, setting, logo ou relacionamento futuro foi criado.

Commit:
```text
feat(db): add institution repository
```

## LOOP 1.3 — Concluído

Escopo atual:
- criar enum `user_role` com `ADMIN` e `EDITOR`;
- criar a tabela `users` com os campos definidos no loop;
- garantir unicidade case-insensitive do e-mail;
- testar migration, defaults, papéis e constraint de e-mail em PostgreSQL;
- não implementar login, hash, sessão ou vínculo institucional.

Implementado:
- enum PostgreSQL `user_role` restrito a `ADMIN` e `EDITOR`;
- tabela `users` com UUID, nome, e-mail, hash de senha, papel, estado ativo e timestamps com fuso;
- índice único funcional sobre `lower(email)`;
- índices de consulta para `role` e `is_active`;
- migration aditiva `0002_unusual_energizer.sql`;
- testes de schema para ambos os papéis, valor padrão ativo e unicidade case-insensitive;
- configuração Vitest restrita aos testes-fonte de `packages/db`, evitando coleta de artefatos compilados.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_3_test`;
- `pnpm --filter @fumep/db test` — 2 arquivos e 4 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 7 testes aprovados entre validation, db e API;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- tabela e modelagem de usuário foram aplicadas e testadas em PostgreSQL real.

Observação:
- nenhum login, serviço de hash, sessão ou vínculo institucional foi implementado.

Commit:
```text
feat(db): add user schema
```

## LOOP 1.4 — Concluído

Escopo atual:
- criar a tabela associativa `user_institutions`;
- definir chaves estrangeiras para usuário e instituição e chave primária composta;
- provar em PostgreSQL que um usuário pode pertencer a múltiplas instituições;
- não implementar autorização, login, sessão ou outras relações de domínio.

Implementado:
- tabela `user_institutions` com `user_id`, `institution_id` e timestamp com fuso;
- chave primária composta que impede vínculos duplicados;
- chaves estrangeiras com `ON DELETE CASCADE` para usuário e `ON DELETE RESTRICT` para instituição;
- migration aditiva `0003_broad_hulk.sql`;
- testes de associação múltipla e rejeição de vínculo duplicado;
- execução serial dos arquivos de integração do pacote de dados para preservar o isolamento das fixtures.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_4_test`;
- `pnpm --filter @fumep/db test` — 3 arquivos e 6 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 9 testes aprovados entre validation, db e API;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- um único usuário foi associado a duas instituições distintas em PostgreSQL real.

Observação:
- nenhuma regra de autorização, login, sessão ou relação de domínio futura foi implementada.

Commit:
```text
feat(db): add user institution relation
```

## LOOP 1.5 — Concluído

Escopo atual:
- criar a tabela `pages` com os oito campos mínimos definidos pelo plano;
- criar o enum canônico `publication_status` e validar seu padrão `DRAFT`;
- vincular autoria opcional a usuários e testar a estrutura em PostgreSQL;
- não implementar instituição, SEO, agendamento, blocos, versões ou publicação.

Implementado:
- enum PostgreSQL `publication_status` com `DRAFT`, `SCHEDULED`, `PUBLISHED` e `EXPIRED`;
- tabela `pages` com os oito campos mínimos, UUID e timestamps com fuso;
- estado padrão `DRAFT`, índice de status e autoria opcional referenciada em `users`;
- migration aditiva `0004_glorious_lockjaw.sql`;
- testes do padrão, campos mínimos, autoria e todos os estados do enum.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_5_test`;
- `pnpm --filter @fumep/db test` — 4 arquivos e 10 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 13 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- a estrutura mínima de `Page` foi criada e exercitada em PostgreSQL real.

Observação:
- `institution_id` e sua unicidade composta permanecem reservados ao loop 1.6; nenhum campo futuro foi antecipado.

Commit:
```text
feat(db): add minimum page schema
```

## LOOP 1.6 — Concluído

Escopo atual:
- adicionar a instituição obrigatória à página com relação N:1;
- garantir unicidade de slug por instituição;
- validar em PostgreSQL slugs iguais entre instituições e duplicidade proibida na mesma instituição;
- não criar associação N:N nem antecipar campos ou funcionalidades futuras.

Implementado:
- coluna obrigatória `pages.institution_id` com chave estrangeira para `institutions` e exclusão restrita;
- índice de consulta por instituição;
- índice único composto `pages_institution_slug_unique` sobre instituição e slug;
- migration aditiva `0005_old_mongu.sql`;
- teste que aceita o mesmo slug em instituições diferentes e rejeita repetição na mesma instituição;
- fixtures existentes de Page ajustadas para respeitar a nova relação obrigatória.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_6_test`;
- `pnpm --filter @fumep/db test` — 4 arquivos e 11 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 14 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- toda página exige exatamente uma instituição, com slug único no respectivo escopo institucional.

Observação:
- nenhuma tabela associativa Page–Institution ou funcionalidade de loops futuros foi criada.

Commit:
```text
feat(db): scope pages by institution
```

## LOOP 1.7 — Concluído

Escopo atual:
- criar `content_blocks` com os campos definidos no plano atual;
- restringir proprietários a `PAGE` e `ARTICLE`, persistir `data` em JSONB e ordenar por posição;
- aplicar defaults estruturais e unicidade de anchor por proprietário;
- não implementar Registry, schemas de blocos, renderização, preview, publicação ou versões.

Implementado:
- enum PostgreSQL `block_owner_type` limitado a `PAGE` e `ARTICLE`;
- tabela `content_blocks` com UUID, proprietário polimórfico, tipo, posição, visibilidade, versão de schema, fundo, mídia de fundo, anchor, JSONB e timestamps com fuso;
- defaults `is_visible = true`, `schema_version = 1` e `background = DEFAULT`;
- índice composto para leitura ordenada por proprietário;
- unicidade de anchor por proprietário;
- migration aditiva `0006_brainy_monster_badoon.sql`;
- testes para dados estruturados, ordenação, visibilidade, defaults, versões e anchor duplicado.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_7_test`;
- `pnpm --filter @fumep/db test` — 5 arquivos e 14 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 17 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- ContentBlock armazenou dados JSONB estruturados, visibilidade e posições ordenadas para um proprietário.

Observação:
- `background_media_id` permanece UUID sem chave estrangeira até a criação canônica da entidade de mídia; Registry, schemas Zod por bloco, renderização, preview, publicação e versões não foram antecipados.

Commit:
```text
feat(builder): add content block schema
```

## LOOP 1.8 — Concluído

Escopo atual:
- criar `page_versions` com snapshots JSONB numerados por página;
- garantir unicidade de versão e exclusão em cascata com a página;
- validar que alterações posteriores na página não modificam snapshots persistidos;
- não implementar restauração, versionamento por bloco, endpoints, preview ou publicação.

Implementado:
- tabela `page_versions` com UUID, referência à página, número, snapshot JSONB, autoria opcional e timestamp com fuso;
- exclusão em cascata das versões quando a página é removida;
- índice de consulta por página e unicidade composta de página e número de versão;
- migration aditiva `0007_open_leper_queen.sql`;
- testes que preservam o snapshot após alteração da página e rejeitam número duplicado na mesma página.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_8_test`;
- `pnpm --filter @fumep/db test` — 6 arquivos e 16 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 19 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- PageVersion preservou um snapshot numerado mesmo após a alteração dos dados vivos da página.

Observação:
- não há `updated_at`, restauração automática, versionamento individual de bloco, endpoint, preview ou publicação.

Commit:
```text
feat(builder): add immutable page versions
```

## LOOP 1.9 — Concluído

Escopo atual:
- criar `audit_logs` com ator opcional, ação, entidade, metadados, IP e timestamp;
- preservar eventos ao excluir fisicamente o usuário, anulando apenas a referência;
- testar a estrutura inicial em PostgreSQL;
- não implementar catálogo completo, instrumentação, endpoints ou interface de consulta.

Implementado:
- tabela `audit_logs` com UUID, usuário opcional, ação, tipo/id da entidade, metadata JSONB, endereço INET e timestamp com fuso;
- referência ao usuário com `ON DELETE SET NULL`, preservando integralmente o evento;
- índices para ator, entidade e ordenação temporal;
- migration aditiva `0008_fixed_sheva_callister.sql`;
- testes de persistência do evento e preservação após exclusão física do usuário.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_9_test`;
- `pnpm --filter @fumep/db test` — 7 arquivos e 18 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 21 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- AuditLog registrou evento administrativo e permaneceu armazenado após a exclusão física do ator.

Observação:
- nenhum catálogo completo, instrumentação, endpoint ou interface de auditoria foi antecipado.

Commit:
```text
feat(db): add initial audit log schema
```

## LOOP 1.10 — Concluído

Escopo atual:
- criar `redirects` com origem única, destino, código HTTP e timestamp;
- usar 301 como padrão e restringir códigos a 301, 302, 307 e 308;
- testar defaults, unicidade e constraint em PostgreSQL;
- não implementar resolução HTTP, geração automática, endpoints ou interface administrativa.

Implementado:
- tabela `redirects` com UUID, origem única, destino, código HTTP e timestamp com fuso;
- código padrão 301 e constraint PostgreSQL limitada a 301, 302, 307 e 308;
- migration aditiva `0009_eager_pestilence.sql`;
- testes de valor padrão, unicidade de origem, todos os códigos permitidos e rejeição de código inválido.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_10_test`;
- `pnpm --filter @fumep/db test` — 8 arquivos e 24 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 27 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- Redirect armazenou origem única, destino e apenas códigos HTTP canônicos, usando 301 por padrão.

Observação:
- resolução HTTP, geração automática, endpoints e interface administrativa não foram antecipados.

Commit:
```text
feat(db): add redirect schema
```

## LOOP 2.1 — Concluído

Escopo atual:
- adicionar Argon2 ao backend com build nativo explicitamente permitido;
- criar serviço de geração e verificação de hashes Argon2id;
- testar hash diferente do texto, senha válida, senha inválida e salt distinto;
- não implementar login, sessão, cookies, recuperação, guards ou endpoints.

Implementado:
- dependência `argon2` adicionada à API e build nativo autorizado explicitamente no workspace;
- `PasswordHasherService` injetável com geração Argon2id e verificação pelo formato PHC do hash;
- testes confirmando prefixo Argon2id, ausência do texto original, senha válida, senha inválida e salts distintos.

Checks executados com sucesso:
- `pnpm rebuild argon2`;
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 2 arquivos e 4 testes aprovados;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 30 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm ignored-builds` — `argon2` não aparece entre os builds explicitamente ignorados;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- a senha gerou hash Argon2id diferente do texto original e foi verificada corretamente sem exposição do segredo.

Observação:
- login, sessão, cookie, recuperação de senha, guards, autorização e endpoints não foram implementados.

Commit:
```text
feat(auth): add Argon2id password hashing
```
