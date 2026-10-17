# MIG 6-MEDIA — Biblioteca de Mídia local

A Biblioteca está utilizável em `http://localhost:3002/admin/media` com o banco de migração `portal_fumep_mig58_test`: login, categoria, upload de imagem/PDF, busca, seleção, prévia privada, variantes e pedido de exclusão. Imagens passam por Worker separado até READY; exclusão é assíncrona. EDITOR opera apenas nas instituições atribuídas, ADMIN pode solicitar novo ciclo de exclusão FAILED por UUID. Este é um MVP local, não a migração do banco preexistente `portal_fumep`.

Para explorar a tela sem lembrar a senha, há um **acesso de demonstração local** com botões ADMIN, EDITOR FUMEP, EDITOR ETMSL e EDITOR CRAMAM. Inicie a API com `FUMEP_LOCAL_DEMO_LOGIN=1` **somente** no processo local, após selecionar o banco dedicado conforme `MVP_PAGE_JOURNEY.md`; abra ou recarregue `/admin/media`. O endpoint permanece oculto/desabilitado por padrão e só aceita origem `http://localhost:3002`, cliente loopback, PostgreSQL `portal_fumep_mig58_test` e Redis local. Ele cria contas separadas de demonstração com senha aleatória não exibida, estabelece cookie HttpOnly/sessão Redis e mantém a autorização normal do backend. Cada EDITOR enxerga somente a instituição escolhida; a opção ADMIN de recuperação de exclusão não aparece para EDITOR. Os botões continuam visíveis após entrar para alternar perfis. **Nunca habilite essa chave em produção**; o recurso não substitui recuperação de senha nem autoriza acesso ao banco principal.

Para testar manualmente, prepare PostgreSQL/Redis/MinIO locais e siga o carregamento seguro de `DATABASE_URL`, `REDIS_URL`, `APP_ORIGIN` e o bootstrap interativo descritos em [MVP_PAGE_JOURNEY.md](MVP_PAGE_JOURNEY.md). Inicie API em 8002 e Nuxt em 3002. Em um terceiro PowerShell, no diretório `apps/backend`, carregue as mesmas variáveis do banco dedicado/Redis, mais `MINIO_ACCESS_KEY` e `MINIO_SECRET_KEY` da `.env` local, defina `MINIO_ENDPOINT=127.0.0.1:9000` e execute `.\.venv\Scripts\python.exe -m app.media_worker_main`. Não inclua credenciais em comandos versionados ou capturas.

Para uma prova automatizada que não depende da senha pessoal e limpa seus dados, com Nuxt já compilado, execute na raiz:

```powershell
pnpm --filter @fumep/portal build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-mig6-media-e2e.ps1
```

O script aceita somente a URL PostgreSQL local prevista, troca para o banco dedicado, usa Redis DB 15, portas temporárias 8004/3004, cria ADMIN efêmero com segredo aleatório em memória, inicia API/Worker/Nuxt ocultos, roda Playwright/axe e remove processos, conta e objetos de teste. Portas ocupadas interrompem a prova. O E2E inclui PDF e imagem até READY com WEBP/AVIF.

Comparação com as telas Next congeladas: o Nuxt reúne upload, categoria e biblioteca em uma tela e acrescenta prévia privada de original/variantes. Ainda faltam nele edição/exclusão de categorias de mídia, escolha explícita de reutilizar duplicata, filtro por categoria/contagem total e edição de logos institucionais oferecidos pelo legado. O retry ADMIN por UUID existe nas duas interfaces. Essas diferenças não autorizam retirar Next/Nest: a paridade V1 e a decisão sobre o banco preexistente continuam pendentes.
