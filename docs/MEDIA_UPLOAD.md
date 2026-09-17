# Upload editorial de imagens e PDF — loops 4.2–4.11

Fluxo: navegador → Next.js → NestJS → MinIO → PostgreSQL. O original permanece no storage; metadados e auditoria ficam no banco. Não existe upload direto ao MinIO ou URL interna entregue ao navegador.

## Uso atual

Com uma sessão administrativa válida, acessar `/admin/media`. O login visual completo não pertence a este loop; a sessão é criada pelo endpoint de autenticação existente. O formulário usa cookie HttpOnly automaticamente e o token CSRF obtido do backend, somente em memória.

Imagens: JPEG, PNG, WebP e AVIF. Limite: 15 × 1024 × 1024 bytes. Extensão, MIME e assinatura precisam corresponder. SVG não é aceito. Nome original é metadado; chave interna é `images/originals/<uuid>.<extensão>`.

Após sucesso de imagem, o original está salvo e o status é `PENDING`. BullMQ/Worker/Sharp geram variantes e persistem READY ou FAILED (loops 4.6–4.10); não indicar processamento concluído no retorno do upload.

## PDF — loop 4.11

O segundo formulário em `/admin/media` aceita `.pdf` (case-insensitive), MIME `application/pdf` e assinatura `%PDF-1.0` até `%PDF-1.7` ou `%PDF-2.0` seguida de quebra de linha. Limite inclusivo: 30 × 1024 × 1024 bytes. O backend valida também tamanho real do Buffer e nome; não confia no filtro HTML. A validação é de assinatura, não um parser completo, antivírus ou remoção de conteúdo ativo.

`POST /api/v1/media/documents` recebe `file`, `categoryId` opcional para ADMIN e `uploadAnyway` opcional. O proxy same-origin é `/admin/media/upload-pdf`. Mantém sessão/CSRF/escopo e as mesmas escolhas de duplicidade, consultadas por checksum e tipo DOCUMENT dentro das instituições autorizadas. EDITOR não pode usar arquivos globais/estrangeiros.

O original é salvo como `documents/<uuid>.pdf`; Media usa DOCUMENT, SHA-256 obrigatório, dimensões nulas e READY após armazenamento e transação de metadados/auditoria. Não enfileira PROCESS_MEDIA nem executa Sharp. Retorna apenas id/nome/MIME/tamanho/categoria/status (201), aviso autorizado de duplicata (200), entrada inválida (400), tamanho excessivo (413) ou falha de gravação amigável (503). A seleção existente aceita PDF e preserva nova checagem institucional, sem MediaUsage. Sem visualizador próprio, endpoint público ou biblioteca independente nesta etapa.

SHA-256 é obrigatório e calculado no servidor sobre o Buffer original, antes da gravação no MinIO. Nome/categoria não entram no hash; checksum fornecido pelo cliente é rejeitado. O índice não é único, preservando registros distintos com os mesmos bytes.

## Categorias mínimas autorizadas (MEDIA-001)

Antecipação explícita do vínculo canônico `Media.category_id → MediaCategory.institution_id` para permitir upload de EDITOR já no 4.2. A gestão/interface completa continua no 4.13.

- `GET /api/v1/media/upload-categories`: lista somente categorias institucionais autorizadas para EDITOR; ADMIN recebe todas.
- `POST /api/v1/media/upload-categories`: cria a categoria mínima usando `{ institutionId, name, slug }`. Requer sessão, origem confiável e `X-CSRF-Token`. EDITOR pode criar somente em instituições atribuídas; `institutionId: null` é global e exclusivo de ADMIN. Slug institucional deve ser único.
- `POST /api/v1/media/images`: multipart com `file` e `categoryId` opcional. EDITOR precisa selecionar uma categoria de instituição atribuída; ADMIN pode enviar sem categoria ou em categoria global.
- Se houver checksum igual na biblioteca autorizada, o upload responde 200 com `{ duplicate: true, existing }`, sem gravar novo original ou Media. O aviso registra `MEDIA_DUPLICATE_DETECTED`.
- O formulário oferece **Usar arquivo existente** (POST `/api/v1/media/selection`, JSON `{ id }`, sessão/CSRF e nova verificação de escopo) ou **Enviar assim mesmo** (`uploadAnyway: "true"` no multipart, resposta 201 com registro distinto). `"false"` não confirma envio.

EDITOR só recebe avisos/seleciona mídias em categorias de suas instituições. Mídia global ou de outra instituição não é oferecida no aviso nem expõe seus metadados ao EDITOR; sua seleção retorna 403. ADMIN pode consultá-la. O uploader não substitui escopo. Uploads simultâneos ou confirmação explícita podem criar registros distintos, com UUID/chaves independentes; checksum não possui constraint UNIQUE.

Selecionar existente retorna a referência autorizada e seu status atual, sem novo arquivo/registro. Não cria MediaUsage nem associa automaticamente a página/bloco; esses consumidores pertencem aos loops futuros. Mídia PENDING continua pendente, sem afirmar processamento concluído.

O backend resolve a instituição consultando a categoria persistida. Não aceita institutionId/uploadedBy no multipart nem usa a autoria como autorização institucional.

## Bloqueio SVG editorial — loop 4.12

SVG não é permitido para ADMIN nem EDITOR em nenhuma rota editorial. O filtro HTML é apenas conveniência: o backend exige correspondência extensão/MIME/assinatura. SVG real com nome PNG/PDF, MIME alterado ou extensão dupla também é rejeitado; bytes PNG/PDF com extensão SVG não são aceitos. A rejeição ocorre antes de MinIO, Media, auditoria de upload/duplicata ou BullMQ. Não há sanitização SVG ou exceção editorial para logos nesta etapa.

## Gestão de categorias — loop 4.13

`/admin/media/manage-categories` lista categorias e instituições autorizadas, cria categoria global (ADMIN) ou institucional e edita nome/slug. A instituição é imutável no contrato de edição: não há transferência silenciosa de acesso a mídias. Exclusão exige confirmação e é bloqueada por FK RESTRICT quando a categoria possui mídia, preservando o vínculo. Não exclui nem descategoriza arquivos automaticamente.

- `GET /api/v1/media/categories`: `{ categories: [{ id, institutionId, name, slug }], institutions: [{ id, name }] }`, sessão e no-store; EDITOR só vê suas instituições.
- `POST /api/v1/media/categories`: `{ institutionId, name, slug }`; ADMIN global ou EDITOR autorizado; 201.
- `PATCH /api/v1/media/categories/:id`: `{ name, slug }`; instituição/uploadedBy/createdBy extras rejeitados; 200.
- `DELETE /api/v1/media/categories/:id`: categoria sem mídia; 204; referência existente ou slug institucional em conflito retorna 409.

Todas as mutações exigem CSRF/origem. Criação/edição/exclusão registram MEDIA_CATEGORY_CREATED/UPDATED/DELETED na mesma transação dos dados. Edição/exclusão bloqueiam a linha e reautorizam o escopo persistido antes de alterar; falha de FK não gera auditoria de sucesso. Erros de infraestrutura são amigáveis. A unicidade existente é canônica `UNIQUE(institution_id, slug)`: instituição nullable continua com semântica SQL de NULL, sem nova regra de unicidade global inventada. A rota mínima upload-categories permanece compatível, agora auditada; conflito de slug usa 409.

## Consistência de armazenamento

Gravação de Media e `MEDIA_UPLOADED` na mesma transação PostgreSQL, após a gravação do original. Em falha, tenta remover somente a chave recém-gerada no MinIO e retorna erro amigável. Falha de compensação gera log com identificador da mídia, sem segredos. MinIO e PostgreSQL não formam uma transação distribuída; quedas abruptas podem deixar um objeto órfão, sem disponibilizar endpoint de exclusão inseguro.

O proxy Next.js encaminha o corpo por streaming e preserva cookie/origem/CSRF para validação no NestJS. POST usa timeout de 30 segundos; leitura de sessão/categorias, cinco segundos. Nenhuma resposta administrativa é cacheada.

Testes atuais: Supertest com MinIO/PostgreSQL reais, migration limpa, contratos/tipos e SSR/interação/proxy em Vitest/jsdom. Não equivalem a execução de Playwright/axe ou revisão visual em navegador.
