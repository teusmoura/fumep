# MIG 4.3 — armazenamento isolado de originais

O backend Python usa o SDK oficial `minio` 7.2.20, injetado em `OriginalImageStorage`. O adaptador opera somente no bucket `portal-private`, já previsto na arquitetura para arquivos não publicados. A futura publicação e eventual migração ao `portal-public` não são parte desta fatia.

`put_image` revalida extensão, MIME, assinatura, tamanho e nome pelo MIG 4.2 antes de chamar MinIO. A chave interna é `images/originals/<uuid>.<extensão-canônica>` e nunca deriva do nome enviado. O retorno contém apenas chave relativa e metadados validados; não há URL pública. `read` aceita apenas chaves desse formato, limita a leitura a 15 MiB e sempre fecha/libera a resposta. `remove` aceita apenas uma chave válida por chamada. Falhas do SDK são propagadas; não há sucesso fictício nem fallback.

Os testes usam cliente em memória para fronteiras/falhas e, opcionalmente, MinIO real. Para a prova real, configurar `FUMEP_MINIO_TEST_ENDPOINT` (`host:porta`), `FUMEP_MINIO_TEST_ACCESS_KEY`, `FUMEP_MINIO_TEST_SECRET_KEY` e `FUMEP_MINIO_TEST_SECURE` (`true`/`false`) no processo do teste. O bucket `portal-private` deve existir; o teste cria uma chave aleatória e remove apenas essa chave. Não usar credenciais de produção. O endpoint, o banco, o Worker, variantes e a política de publicação ficam para loops posteriores.
