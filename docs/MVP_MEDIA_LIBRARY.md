# MIG 6-MEDIA — Biblioteca de Mídia local

A Biblioteca está utilizável em `http://localhost:3002/admin/media` com o banco de migração `portal_fumep_mig58_test`: login, categoria, upload de imagem/PDF, busca, seleção, prévia privada, variantes e pedido de exclusão. Imagens passam por Worker separado até READY; exclusão é assíncrona. EDITOR opera apenas nas instituições atribuídas, ADMIN pode solicitar novo ciclo de exclusão FAILED por UUID. Este é um MVP local, não a migração do banco preexistente `portal_fumep`.

Para testar manualmente, prepare PostgreSQL/Redis/MinIO locais e siga o carregamento seguro de `DATABASE_URL`, `REDIS_URL`, `APP_ORIGIN` e o bootstrap interativo descritos em [MVP_PAGE_JOURNEY.md](MVP_PAGE_JOURNEY.md). Inicie API em 8002 e Nuxt em 3002. Em um terceiro PowerShell, no diretório `apps/backend`, carregue as mesmas variáveis do banco dedicado/Redis, mais `MINIO_ACCESS_KEY` e `MINIO_SECRET_KEY` da `.env` local, defina `MINIO_ENDPOINT=127.0.0.1:9000` e execute `.\.venv\Scripts\python.exe -m app.media_worker_main`. Não inclua credenciais em comandos versionados ou capturas.

Para uma prova automatizada que não depende da senha pessoal e limpa seus dados, com Nuxt já compilado, execute na raiz:

```powershell
pnpm --filter @fumep/portal build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-mig6-media-e2e.ps1
```

O script aceita somente a URL PostgreSQL local prevista, troca para o banco dedicado, usa Redis DB 15, portas temporárias 8004/3004, cria ADMIN efêmero com segredo aleatório em memória, inicia API/Worker/Nuxt ocultos, roda Playwright/axe e remove processos, conta e objetos de teste. Portas ocupadas interrompem a prova. O E2E inclui PDF e imagem até READY com WEBP/AVIF.

Comparação com as telas Next congeladas: o Nuxt reúne upload, categoria e biblioteca em uma tela e acrescenta prévia privada de original/variantes. Ainda faltam nele edição/exclusão de categorias de mídia, escolha explícita de reutilizar duplicata, filtro por categoria/contagem total e edição de logos institucionais oferecidos pelo legado. O retry ADMIN por UUID existe nas duas interfaces. Essas diferenças não autorizam retirar Next/Nest: a paridade V1 e a decisão sobre o banco preexistente continuam pendentes.
