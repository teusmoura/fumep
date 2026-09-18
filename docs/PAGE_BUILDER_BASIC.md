# Page Builder básico — 5.9

QA local em fixture removido: 390×844 e 1280×900, LIGHT/DARK; adição dos três blocos por teclado, callback cumulativo, foco no status após desmontar editor de adição, foco visível/botões 44px, sem overflow global nem erros/warnings no console. Não cobre owner/salvamento/publicação reais nem contraste global. Viewport restaurado, aba fechada e servidor temporário encerrado.

PageBuilder é componente Client compartilhado, para draft PAGE/ARTICLE. Recebe initialBlocks desconhecidos, imagens da seleção disponível, context e onApply async. O caller deve remontar por proprietário/versão/contexto; fornece ThemeContext e seleção autorizada e resolve instituição pela rota. Não existe nova rota ou endpoint neste loop.

A montagem valida todos os envelopes pelo Registry exato, contexto, IDs e posições únicos. Falha inicial não substitui dados. A lista é apresentada por position. Adição cria UUID via crypto.randomUUID e position posterior à maior existente, fundo DEFAULT/visível/schemaVersion 1, sem coerção. TEXT começa com documento vazio; HERO com título editável "Novo destaque"; IMAGE requer imagem disponível e inicia informativa, sem transformar falta de alt em decoração. Esses defaults são draft, não aprovação de publicação.

Escolher adição abre o editor registrado; enquanto o novo bloco está pendente não abre outro. Aplicar conteúdo válido emite snapshot clonado completo ao caller. Só após callback bem-sucedido a lista local muda. Falha mantém o editor/draft para corrigir/repetir, com feedback focável e bloqueio concorrente. Editores existentes também atualizam apenas dados específicos, preservando envelope/UUID/position. Não há reorder/duplicate/hide/delete/anchors/backgrounds livres, Preview nem renderer paralelo.

Biblioteca filtrada não é controle de autorização. O backend futuro deve validar contexto/autorização do owner, versões, disponibilidade/acesso à mídia, MediaUsage, completude acessível e regras de publicação dentro de transação. onApply não significa salvamento no servidor nem publicação. Não há fetch, banco direto, credenciais, localStorage ou publicação implícita.

Controles nativos nomeados, headings e lista semântica, foco/status e tokens herdados; adição IMAGE desabilitada com explicação quando não há imagem disponível. Testes cobrem contexto/contratos/IDs/posição, adição dos três tipos, callback/falha/concorrência e axe-core semântico em jsdom (sem contraste/layout). Script test:e2e ainda inexistente.
