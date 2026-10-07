# MIG 6 — primeira jornada de página no navegador

Esta é uma publicação **experimental local**: só usa `portal_fumep_mig58_test`, não escreve no banco preexistente `portal_fumep`, não indexa busca e serve a página pública com `Cache-Control: no-store`. O renderer conectado aceita apenas blocos `TEXT`; outros blocos seguem validados/persistidos no PageTemplate, mas a publicação experimental os recusa explicitamente até haver renderização real de mídia/feeds. Não equivale à paridade V1 nem a ambiente de produção.

## Preparar o banco e iniciar

Em PowerShell, dentro de `C:\dev\fumep\apps\backend`, carregue `DATABASE_URL` e `REDIS_URL` da `.env` local sem exibir credenciais, e redirecione **somente o processo atual** para o banco dedicado:

```powershell
Get-Content C:\dev\fumep\.env | ForEach-Object {
  if ($_ -match '^(DATABASE_URL|REDIS_URL)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim('"'), 'Process')
  }
}
$uri = [System.UriBuilder]::new($env:DATABASE_URL)
if ($uri.Host -notin @('localhost', '127.0.0.1') -or $uri.Path -ne '/portal_fumep') { throw 'URL de origem inesperada' }
$uri.Path = '/portal_fumep_mig58_test'
$env:DATABASE_URL = $uri.Uri.AbsoluteUri
$env:APP_ORIGIN = 'http://localhost:3002'
$env:LOGIN_RATE_LIMIT_SECRET = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Depois de aplicar as migrations já versionadas no banco dedicado, execute uma vez o bootstrap interativo (a senha não aparece nem vai para arquivo/Git) e inicie a API:

```powershell
.\.venv\Scripts\python.exe -m scripts.bootstrap_mig6_demo
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```

Para criar apenas o login sem configurar variáveis manualmente, execute **um comando** na raiz do projeto; ele lê a `.env`, valida o endereço local, seleciona temporariamente o banco de demonstração e pede e-mail/senha no terminal:

```powershell
.\scripts\bootstrap-mig6-login.ps1
```

Esse atalho não inicia a API nem o Nuxt. Se o PowerShell bloquear scripts locais, use `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap-mig6-login.ps1`; a liberação vale só para o processo criado, sem mudar a política permanente.

Se precisar redefinir a senha de um ADMIN desse banco local, rode o mesmo atalho com `-Reset`. Ele exige o e-mail existente, confirmação, nova senha digitada duas vezes e Redis local disponível para remover sessões anteriores. A senha não é exibida nem salva em arquivo. Isso **não** é o fluxo de recuperação de produção:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap-mig6-login.ps1 -Reset
```

Em outro PowerShell, dentro de `C:\dev\fumep\apps\portal`:

```powershell
$env:NUXT_PUBLIC_API_BASE = 'http://localhost:8002'
.\node_modules\.bin\nuxt.cmd dev --port 3002
```

Abra `http://localhost:3002/admin/pages`. Entre com o ADMIN criado, escolha uma das três instituições, crie um modelo de texto, aplique-o, edite e salve o rascunho. A prévia protegida carrega a versão salva; **Salvar e publicar** gera `PageVersion` e libera o link público SSR. A API e a página pública não usam cache. Use sempre `localhost` no navegador (não misture com `127.0.0.1`), para que o cookie HttpOnly funcione entre as portas 3002 e 8002.

O editor antigo em `/builder-demo` continua sendo somente fixture e não foi conectado. A base `portal_fumep` permanece intocada. Se já houver ADMIN no banco de migração, o bootstrap não altera a senha; entre com a credencial existente ou trate a conta separadamente.
