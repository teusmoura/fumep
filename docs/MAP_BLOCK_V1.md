# MAP v1 — loop 5.27

MAP é um bloco de PAGE com schemaVersion 1. `data` contém `latitude` entre −90 e 90, `longitude` entre −180 e 180 e `address` obrigatório (até 500 caracteres); `title` (até 200 caracteres) e `zoom` inteiro de 1 a 19 são opcionais. O schema é estrito e não aceita HTML, iframe, URL ou código editorial de mapa. O draft padrão começa em coordenadas 0,0 e exige revisão editorial antes de uso real.

O editor Client valida esses campos, preserva o draft diante de falha de `onApply` e não salva/publica por si só. O renderer SSR falha fechado para conteúdo inválido/oculto, usa `BlockBackground` e tema resolvido pelo caller, e mostra título, endereço, coordenadas e link externo seguro calculado a partir dos números. O link de OpenStreetMap usa marcador e zoom documentados pela comunidade OpenStreetMap; o visitante só se conecta ao provedor quando ativa o link. Não há iframe, script ou mapa remoto carregado automaticamente; essa apresentação acessível evita captura de teclado e transferência passiva de IP. O endereço não é geocodificado: coordenadas e texto são responsabilidade editorial. Como o plano não fixa provedor de mapa, o vínculo externo pode ser revisto sem migrar conteúdo persistido.

MAP não está disponível em ARTICLE. Autorização, persistência, preview e publicação continuam sob responsabilidade dos seus loops/callers, não do bloco.
