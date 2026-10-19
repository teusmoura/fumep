# MIG 6-GALLERY-FEED — galeria pública local

Com PostgreSQL dedicado `portal_fumep_mig58_test`, Redis, MinIO, Worker, API FastAPI em `127.0.0.1:8002` e Nuxt em `localhost:3002`, a jornada é:

1. Em `/admin/media`, crie uma categoria de mídia da instituição desejada e envie duas imagens; aguarde ambas ficarem READY.
2. Em `/admin/editorial`, crie uma galeria da mesma instituição, adicione as imagens com textos alternativos, ajuste legendas e ordem.
3. Em `/admin/pages`, crie/aplique um modelo de texto, adicione um bloco de galeria, selecione a galeria, salve e publique.
4. Abra o link público gerado em uma janela anônima. As imagens são servidas pela API pública somente enquanto a página publicada as referencia; não exigem login nem expõem a chave do MinIO. A ordem, legenda e texto alternativo refletem a galeria atual ao recarregar a página.

O snapshot imutável `PageVersion` guarda a configuração do bloco (`galleryId`, título e limite), **não** copia os itens da galeria. A projeção pública é dinâmica e sem cache neste MVP; mídia que deixe de estar READY ou esteja em exclusão não é exposta. O endpoint de imagem verifica página publicada, bloco visível, galeria no escopo e item incluído dentro do limite. Publicação recusa galeria com imagem indisponível ou fora da instituição. Outros tipos de bloco além de `TEXT` e `GALLERY_FEED` permanecem sem renderer público nesta fatia.

Prova automatizada com serviços temporários e conta descartável, a partir da raiz:

```powershell
pnpm --filter @fumep/portal build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-mig6-media-e2e.ps1 -GalleryFeed
```

O script só aceita serviços locais, usa o banco dedicado, limpa os dados/objetos criados e não toca em `portal_fumep`. O legado Next/Nest permanece preservado. O login de demonstração local está descrito em [MVP_MEDIA_LIBRARY.md](MVP_MEDIA_LIBRARY.md); não o habilite em produção.
