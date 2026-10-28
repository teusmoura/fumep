# MIG 6-NEWS — primeira notícia publicável

Abra `/admin/noticias` no Nuxt local para criar um rascunho com título, slug global, uma ou mais instituições, categoria editorial e blocos `TEXT`. Escolha uma capa `IMAGE` em estado `READY` na Biblioteca, forneça texto alternativo, salve e publique. A tela mostra o link público por instituição; `/noticias/fumep` lista notícias publicadas e `/noticias/fumep/<slug>` mostra o detalhe SSR sem login. Há links para criar a categoria e enviar a imagem em `/admin/editorial` e `/admin/media`. Os botões de perfil de demonstração dependem da configuração local descrita em [MVP_MEDIA_LIBRARY.md](MVP_MEDIA_LIBRARY.md).

O FastAPI exige sessão, CSRF e escopo institucional no backend. Categoria e capa devem estar disponíveis para todas as instituições selecionadas; uma categoria ou mídia institucional só pode servir a uma notícia daquela instituição. A capa gera `MediaUsage` para impedir exclusão enquanto referenciada. Rascunho pode não ter capa; publicação exige capa READY, alt e corpo. A publicação é transacional e grava `ArticleVersion` com snapshot de conteúdo; nova tentativa de publicar o mesmo artigo falha. A API pública entrega apenas artigos publicados, imagens autorizadas e dados de apresentação, sem chave MinIO. Corpo e resumo são texto simples, renderizados pelo Vue com escape.

Para prova automatizada com serviços locais, aplique a migration `20261028_04` **somente** no banco `portal_fumep_mig58_test`, com `FUMEP_MIGRATION_DATABASE_URL` local conforme o guard do Alembic. Depois, na raiz:

```powershell
pnpm --filter @fumep/portal build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-mig6-media-e2e.ps1 -News
```

O script cria uma conta descartável, usa Redis DB 15 e portas 8004/3004, executa Playwright/axe e limpa conta, dados e arquivos de teste. Para explorar em 3002, siga a configuração local de API/Nuxt/Worker em [MVP_MEDIA_LIBRARY.md](MVP_MEDIA_LIBRARY.md). Esta fatia não inclui edição após publicar, agendamento, tags, outros blocos `ARTICLE`, `NEWS_FEED`, busca, estágio nem migração da base principal. O legado Next/Nest permanece preservado.
