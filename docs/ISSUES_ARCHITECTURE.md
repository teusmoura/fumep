# ISSUES DE ARQUITETURA

Use este arquivo apenas quando a implementação encontrar uma contradição real não resolvida pelo manifesto e pelos documentos especializados.

## Abertos

### AUTH-001 — Limite entre Login (2.2) e Sessão Redis (2.3)

Classificação: **bloqueador**.

Contexto:
- o `LOOP 2.2` do plano canônico exige `POST /api/v1/auth/login` e aceita quando credenciais válidas criam sessão;
- o `LOOP 2.3` reserva explicitamente a implementação da sessão server-side Redis e do cookie;
- o documento especializado de segurança, que possui precedência maior, define o fluxo de login como uma operação única que cria a sessão no Redis e envia o cookie.

Conflito:
- concluir o aceite do loop 2.2 sem Redis/cookie exigiria uma implementação temporária de sessão não prevista;
- implementar Redis/cookie no loop 2.2 anteciparia explicitamente o escopo do loop 2.3.

Decisão necessária:
- mover a criação efetiva da sessão e o cookie para o loop 2.2, tornando o 2.3 um loop de robustecimento/testes; ou
- redefinir o aceite do 2.2 para validar credenciais e produzir os dados de sessão por uma abstração, deixando persistência Redis e cookie para o 2.3.

## Regra

Não transformar uma preferência de implementação em "problema de arquitetura".
Registrar somente decisões que exijam alteração do escopo ou de uma regra canônica.
