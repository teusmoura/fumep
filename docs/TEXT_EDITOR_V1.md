# Editor TEXT v1

O `TextBlockEditor` é um componente Client independente para editar `TextBlockDataV1`. Usa controles nativos visuais, sem exigir JSON ou importar HTML: título, parágrafos, headings 2/3/4, destaques, listas e tabela simples. Trechos permitem negrito/itálico e links validados pelo contrato compartilhado.

`initialValue` é validado ao montar. Dados inválidos não são substituídos por um documento vazio. Ao trocar o bloco/proprietário/versão, o caller deve remontar o componente com uma `key` apropriada. Alterações locais inválidas permanecem disponíveis para correção; desfazer/refazer guarda até 20 operações. Limites vêm de `TEXT_V1_LIMITS`; operações de tabela preservam sua estrutura retangular.

`onApply` recebe somente dados validados e pode retornar uma Promise. Aplicação concorrente é bloqueada, controles ficam desabilitados durante o callback e falhas preservam o draft. Aplicar não publica nem salva no servidor: persistência, autorização backend, CSRF e integração com o Page Builder pertencem aos respectivos consumidores/loops posteriores. Não há rede, credenciais, localStorage ou autoridade sobre proprietário neste componente.

Conteúdo colado é texto literal; não há contentEditable, HTML interpretado, CSS livre ou renderer público. Cores/foco usam tokens existentes. Labels, fieldsets, tabela semântica, região rolável focável, avisos e foco no status oferecem suporte aos controles nativos de teclado.

Testes cobrem contrato, draft inválido, formatação, URLs perigosas, histórico, tabela, callback e estados desabilitados. axe-core verifica controles ativos/com erro e desabilitados em jsdom, sem violações; contraste é desativado porque jsdom não fornece layout. Isso não substitui QA visual, contraste ou navegação em navegador real; E2E/browser não executados neste loop. O Registry permanece sem definição incompleta até o renderer do 5.5.
