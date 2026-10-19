# MIG 6-EDITORIAL — categorias e galerias locais

Com API FastAPI em `http://127.0.0.1:8002`, Nuxt em `http://localhost:3002`, PostgreSQL dedicado `portal_fumep_mig58_test`, Redis, MinIO e Worker locais, abra `http://localhost:3002/admin/editorial`. Entre com sua conta ou use os perfis de demonstração **somente se** `FUMEP_LOCAL_DEMO_LOGIN=1` estiver habilitado nas condições locais descritas em [MVP_MEDIA_LIBRARY.md](MVP_MEDIA_LIBRARY.md). Não habilite o login de demonstração em produção.

Na tela, crie e edite uma categoria editorial; crie uma galeria para a instituição desejada; escolha imagens READY da Biblioteca, defina texto alternativo e legenda, ordene os itens e confira a prévia autenticada `GALLERY_FEED`. Alterações persistem após recarregar a página. É possível remover itens, galerias e categorias não utilizadas. ADMIN pode gerenciar registros globais e institucionais; EDITOR fica restrito às instituições atribuídas pelo backend. A imagem deve pertencer ao escopo da galeria para ser adicionada por EDITOR. Para preparar imagens, use `/admin/media` e aguarde o Worker concluir o processamento.

Prova automatizada com dados descartáveis, a partir da raiz e com os serviços locais disponíveis:

```powershell
pnpm --filter @fumep/portal build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-mig6-media-e2e.ps1 -Editorial
```

O script usa portas temporárias, conta efêmera, banco dedicado e limpeza dos dados/objetos. A prévia do feed é protegida pela sessão; **não** é publicação pública. Ainda não há artigos, estágio ou renderização pública do `GALLERY_FEED`. O banco preexistente `portal_fumep` e o legado Next/Nest seguem intocados.
