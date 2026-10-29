# MIG 6-NEWS-FEED — notícias em páginas públicas

Com PostgreSQL dedicado `portal_fumep_mig58_test`, Redis, MinIO, Worker, FastAPI em `127.0.0.1:8002` e Nuxt em `localhost:3002`:

1. Em `/admin/media`, envie uma imagem com texto alternativo e aguarde o estado READY.
2. Em `/admin/editorial`, crie uma categoria editorial.
3. Em `/admin/noticias`, crie uma notícia com instituição, categoria, capa e texto; salve e publique. Confira a listagem e o detalhe em `/noticias/<instituição>`.
4. Em `/admin/pages`, crie/aplique um modelo de texto, adicione o bloco de notícias, escolha instituições, categorias e limite (1–12), salve e publique.
5. Abra a página publicada em janela anônima. O cartão mostra capa, título, resumo, data e link para o detalhe. Uma notícia publicada depois também aparece ao recarregar, sem republicar a página.

Sem instituições marcadas, o feed usa a instituição da página. Sem categorias marcadas, inclui todas as categorias das instituições selecionadas. A ordem é da publicação mais recente para a mais antiga. O backend restringe as instituições configuráveis ao escopo do editor e rejeita categorias fora delas. O snapshot da página guarda apenas a configuração do feed; a API consulta notícias publicadas e capas READY a cada leitura. O navegador recebe imagem por endpoint público controlado, sem chave interna do MinIO.

Prova automatizada com serviços locais e conta descartável:

```powershell
pnpm --filter @fumep/portal build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-mig6-media-e2e.ps1 -NewsFeed
```

O script usa somente o banco dedicado e limpa seus dados de teste. Este MVP local ainda não inclui agendamento, tags, busca, estágio nem paridade completa com o legado. O banco `portal_fumep` e o Next/Nest permanecem intocados.
