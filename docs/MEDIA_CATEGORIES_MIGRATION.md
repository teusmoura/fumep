# MIG 4.4 — categorias de mídia isoladas

`MediaCategoryService` implementa criação, listagem e seleção de categorias antes da integração HTTP/PostgreSQL. O contrato exige nome não vazio após trim (até 120 caracteres), slug minúsculo de até 120 caracteres e vínculo opcional com uma instituição existente. O retorno preserva os campos canônicos de identificação, autoria e timestamps. O repositório de demonstração existe somente nos testes; não é persistência real.

ADMIN pode criar e ver categorias globais ou de qualquer instituição. EDITOR só cria, lista e seleciona categorias vinculadas a uma instituição atualmente atribuída; categorias globais e estrangeiras não aparecem nem são selecionáveis. Todas as operações comparam a sessão com o estado atual de usuário fornecido por uma fonte confiável do backend. A criação rejeita instituição inexistente e valida escopo antes da escrita. Categoria ausente ou fora de escopo recebe a mesma falha de seleção.

O teste em memória espelha a unicidade `UNIQUE(institution_id, slug)` para vínculos institucionais. A semântica de `NULL` para categorias globais e a integração transacional com o PostgreSQL ficam para a fase de persistência. Não há endpoint, UI, associação a uploads ou alteração do schema neste loop.
