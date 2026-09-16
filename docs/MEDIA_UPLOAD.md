# Upload de imagem — loop 4.2

Fluxo: navegador → Next.js → NestJS → MinIO → PostgreSQL. O original permanece no storage; metadados e auditoria ficam no banco. Não existe upload direto ao MinIO ou URL interna entregue ao navegador.

## Uso atual

Com uma sessão administrativa válida, acessar `/admin/media`. O login visual completo não pertence a este loop; a sessão é criada pelo endpoint de autenticação existente. O formulário usa cookie HttpOnly automaticamente e o token CSRF obtido do backend, somente em memória.

Formatos: JPEG, PNG, WebP e AVIF. Limite: 15 × 1024 × 1024 bytes. Extensão, MIME e assinatura precisam corresponder. SVG e PDF não são aceitos neste estágio. Nome original é metadado; chave interna é `images/originals/<uuid>.<extensão>`.

Após sucesso, o original está salvo e o status é `PENDING`. Fila, processamento e variantes pertencem aos loops 4.6–4.10; não indicar que a imagem já foi processada.

SHA-256 é obrigatório e calculado no servidor sobre o Buffer original, antes da gravação no MinIO. Nome/categoria não entram no hash; checksum fornecido pelo cliente é rejeitado. O índice não é único, preservando registros distintos com os mesmos bytes.

## Categorias mínimas autorizadas (MEDIA-001)

Antecipação explícita do vínculo canônico `Media.category_id → MediaCategory.institution_id` para permitir upload de EDITOR já no 4.2. A gestão/interface completa continua no 4.13.

- `GET /api/v1/media/upload-categories`: lista somente categorias institucionais autorizadas para EDITOR; ADMIN recebe todas.
- `POST /api/v1/media/upload-categories`: cria a categoria mínima usando `{ institutionId, name, slug }`. Requer sessão, origem confiável e `X-CSRF-Token`. EDITOR pode criar somente em instituições atribuídas; `institutionId: null` é global e exclusivo de ADMIN. Slug institucional deve ser único.
- `POST /api/v1/media/images`: multipart com `file` e `categoryId` opcional. EDITOR precisa selecionar uma categoria de instituição atribuída; ADMIN pode enviar sem categoria ou em categoria global.

O backend resolve a instituição consultando a categoria persistida. Não aceita institutionId/uploadedBy no multipart nem usa a autoria como autorização institucional.

## Consistência e limites desta etapa

Gravação de Media e `MEDIA_UPLOADED` na mesma transação PostgreSQL, após a gravação do original. Em falha, tenta remover somente a chave recém-gerada no MinIO e retorna erro amigável. Falha de compensação gera log com identificador da mídia, sem segredos. MinIO e PostgreSQL não formam uma transação distribuída; quedas abruptas podem deixar um objeto órfão, sem disponibilizar endpoint de exclusão inseguro.

O proxy Next.js encaminha o corpo por streaming e preserva cookie/origem/CSRF para validação no NestJS. POST usa timeout de 30 segundos; leitura de sessão/categorias, cinco segundos. Nenhuma resposta administrativa é cacheada.

Testes atuais: Supertest com MinIO/PostgreSQL reais, migration limpa, contratos/tipos e SSR/interação/proxy em Vitest/jsdom. Não equivalem a execução de Playwright/axe ou revisão visual em navegador.
