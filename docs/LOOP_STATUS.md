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
