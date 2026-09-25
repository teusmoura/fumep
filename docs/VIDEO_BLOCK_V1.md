# VIDEO v1 — loop 5.28

VIDEO usa `schemaVersion: 1` e está disponível em PAGE e ARTICLE. `data` contém `url` HTTPS de um vídeo individual YouTube (`youtube.com/watch?v=...` ou `youtu.be/...`) ou Vimeo (`vimeo.com/<id>`), `title` obrigatório (até 200 caracteres) e `description?` (até 1000 caracteres). Hosts são comparados exatamente; credenciais, portas, fragmentos, parâmetros extras, IDs inválidos e HTML/iframe editoriais são recusados. A URL fica no conteúdo como referência editorial; a incorporação é reconstruída a partir do ID validado.

O editor Client aplica via callback assíncrono e retém alterações após falha. O renderer SSR usa `BlockBackground`/tema do caller, exibe título, descrição e link externo e oferece um botão para carregar o player. Só após ativação explícita do visitante é montado um iframe com origem controlada (`youtube-nocookie.com` ou `player.vimeo.com`), título acessível e proporção 16:9 responsiva. Nenhum vídeo remoto é carregado automaticamente. O draft padrão aponta para o vídeo de exemplo público documentado pelo YouTube e deve ser trocado editorialmente antes de publicação real.

Autorização, persistência, Preview e publicação não são responsabilidade deste bloco. A renderização falha fechado em conteúdo inválido/oculto. Não existe endpoint, upload ou dependência nova.
