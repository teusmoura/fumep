# ARQUITETURA TÉCNICA V1 — IMPLANTAÇÃO E TRANSIÇÃO PARA PRODUÇÃO

## 1. OBJETIVO

Este documento define a estratégia de **implantação, homologação, preparação editorial, validação, entrada em produção e rollback** do novo Portal FUMEP.

A decisão central é:

> **Não haverá migração automática de conteúdo do site atual.**

O novo Portal FUMEP será construído, alimentado e validado paralelamente. Apenas os conteúdos considerados relevantes serão recriados manualmente dentro do novo modelo.

---

# 2. PRINCÍPIO GERAL

O portal atual continuará funcionando durante o desenvolvimento do novo.

Fluxo:

```text
SITE ATUAL
continua em produção
        │
        │
        └───────────────┐
                        │
                        ▼
                NOVO PORTAL FUMEP
                ambiente separado
                        │
                        ▼
                 desenvolvimento
                        │
                        ▼
                  homologação
                        │
                        ▼
             alimentação manual
                        │
                        ▼
              validação editorial
                        │
                        ▼
               validação técnica
                        │
                        ▼
                  aprovação final
                        │
                        ▼
                 entrada no ar
```

---

# 3. SEM MIGRAÇÃO AUTOMÁTICA

Não serão criados inicialmente:

- importadores de páginas antigas;
- conversores de HTML legado;
- migração em massa de notícias;
- migração em massa de PDFs;
- scripts para recriar estruturas antigas;
- mecanismos automáticos para converter conteúdo legado em ContentBlocks.

---

# 4. RECONSTRUÇÃO MANUAL

Cada conteúdo antigo será analisado individualmente.

Pergunta principal:

```text
Ainda faz sentido?
```

Se sim:

```text
recriar/revisar no novo Portal
```

Se não:

```text
não migrar
```

---

# 5. BENEFÍCIOS

A estratégia evita transportar para o novo portal:

```text
estrutura antiga
conteúdo obsoleto
HTML inconsistente
arquivos sem contexto
links desnecessários
problemas de acessibilidade legados
```

---

# 6. AMBIENTES

A arquitetura deverá suportar:

```text
development
staging
production
```

Neste projeto, staging/homologação será considerado parte essencial da estratégia de transição.

---

# 7. AMBIENTE DE HOMOLOGAÇÃO

O novo portal deverá existir em endereço separado do site atual.

Exemplo conceitual:

```text
portal-homologacao...
```

O endereço real dependerá da infraestrutura institucional.

---

# 8. NÃO INDEXAÇÃO DE STAGING

Enquanto o novo portal estiver em preparação:

```text
noindex
```

deverá ser aplicado.

Também poderá haver restrição adicional no Nginx.

---

# 9. PROTEÇÃO DO AMBIENTE DE HOMOLOGAÇÃO

Preferencialmente:

```text
acesso restrito
```

ou:

```text
autenticação HTTP
```

para evitar exposição pública prematura.

---

# 10. PREPARAÇÃO INSTITUCIONAL

Antes do go-live deverão estar configuradas:

```text
FUMEP
ETMSL
CRAMAM
```

Para cada uma:

```text
nome
logo
logo dark
cores
contato
endereço
links essenciais
redes sociais
tema
menu
footer
```

---

# 11. ESTRUTURA ANTES DO CONTEÚDO

A ordem de preparação recomendada será:

```text
menus
↓
páginas
↓
URLs
↓
breadcrumbs
↓
templates
↓
conteúdo
```

---

# 12. PÁGINAS

Mantém-se a regra:

```text
ADMIN
→ cria página
→ define instituição
→ slug
→ estrutura inicial
```

Depois:

```text
EDITOR
→ trabalha blocos
→ finaliza conteúdo
```

---

# 13. REVISÃO DE CONTEÚDO

Ao recriar páginas, a equipe deverá revisar:

```text
texto
ortografia
datas
links
documentos
responsáveis
telefones
endereços
acessibilidade
hierarquia
```

---

# 14. DOCUMENTOS

Não haverá importação em massa.

Fluxo:

```text
documento vigente/relevante
↓
upload pela Biblioteca
↓
validação
↓
checksum
↓
MinIO
↓
vinculação ao conteúdo
```

---

# 15. NOTÍCIAS ANTIGAS

Notícias antigas não serão migradas automaticamente.

A equipe poderá recriar manualmente apenas conteúdos históricos que ainda tenham valor institucional.

---

# 16. CURSOS

Os cursos relevantes deverão ser cadastrados diretamente no novo módulo estruturado.

Campos esperados:

```text
nome
descrições
ofertas
modalidade
turno
duração
carga horária
perfil
mercado
matriz
documentos
coordenador
```

---

# 17. ESTÁGIO

A área de Estágio será construída diretamente no novo modelo.

Categorias previstas:

```text
Orientações
Formulários
Relatórios
Legislação
Documentos por curso
```

---

# 18. PROCESSOS SELETIVOS E CONCURSOS

Não haverá migração manual do histórico antigo quando a nova integração externa já assumir essa função.

O portal exibirá os registros fornecidos pelo sistema externo.

---

# 19. CHECKLIST EDITORIAL

Antes da entrada em produção, cada instituição deverá validar:

```text
Home
Menu
Páginas institucionais principais
Contatos
Cursos / atividades
Estágio, quando aplicável
Notícias necessárias
Eventos necessários
Documentos
Links externos
Footer
```

---

# 20. CHECKLIST TÉCNICO

Validar:

```text
HTTPS
Nginx
PostgreSQL
Redis
MinIO
Worker
Matomo
login
permissões
Page Builder
Preview
publicação
busca
dark mode
acessibilidade
mobile
desktop
health checks
backup
```

---

# 21. CHECKLIST DE ACESSIBILIDADE

Validar:

```text
skip link
teclado
drawer
focus
contraste
dark mode
alt
formulários
tabs
accordion
autocomplete
VLibras
reduced motion
```

---

# 22. VALIDAÇÃO DOS TEMAS

Testar:

```text
FUMEP Light
FUMEP Dark
ETMSL Light
ETMSL Dark
CRAMAM Light
CRAMAM Dark
```

---

# 23. VALIDAÇÃO RESPONSIVA

Testar pelo menos:

```text
320px
375px
768px
1024px
1280px+
```

---

# 24. LINKS ANTIGOS IMPORTANTES

Mesmo sem migração, poderá existir mapeamento manual de URLs relevantes.

Exemplo:

```text
URL antiga de cursos
→ /etmsl/cursos

URL antiga de estágio
→ /etmsl/estagio
```

---

# 25. REDIRECTS 301

Quando houver equivalente claro:

```text
URL antiga
↓
301
↓
URL nova
```

A entidade `Redirect` já prevista poderá ser utilizada.

---

# 26. SEM REDIRECT INDISCRIMINADO

Não redirecionar todas as páginas removidas para a Home.

Se não houver equivalente:

```text
404
```

é aceitável.

---

# 27. AUDITORIA DE LINKS

Antes da virada, testar:

```text
links internos quebrados
links externos quebrados
documentos inexistentes
anchors inválidos
```

---

# 28. FREEZE EDITORIAL

Próximo à entrada em produção, poderá haver uma janela curta de congelamento editorial do novo portal.

Objetivo:

```text
evitar alterações de última hora
durante a validação final
```

---

# 29. GO-LIVE

Fluxo sugerido:

```text
1. validar produção nova
2. confirmar banco
3. confirmar MinIO
4. confirmar Redis
5. confirmar Worker
6. confirmar Matomo
7. confirmar HTTPS
8. confirmar páginas principais
9. confirmar busca
10. confirmar redirects
11. apontar tráfego para o novo portal
```

---

# 30. TROCA DE TRÁFEGO

A mudança poderá ocorrer por:

```text
Nginx
DNS
ou ambos
```

---

# 31. PREFERÊNCIA POR NGINX

Se a infraestrutura permitir, a troca principal deverá preferencialmente ser controlada no Nginx.

Exemplo:

```text
antes
domínio
→ aplicação antiga

depois
domínio
→ novo Portal
```

---

# 32. ROLLBACK

O portal antigo não deverá ser removido imediatamente após a virada.

Se ocorrer problema crítico:

```text
novo Portal
↓
problema
↓
Nginx volta para aplicação antiga
```

---

# 33. PERÍODO DE SEGURANÇA

A aplicação antiga poderá permanecer disponível internamente por um período após o go-live.

Finalidades:

```text
consultar documento antigo
recuperar texto importante
verificar link legado
```

---

# 34. CRITÉRIOS PARA GO-LIVE

O novo Portal só poderá entrar em produção quando:

```text
CI aprovada
E2E crítico aprovado
páginas essenciais prontas
menus revisados
temas revisados
permissões testadas
busca funcionando
mídia funcionando
integrações funcionando
health saudável
backup contemplado
acessibilidade crítica aprovada
responsividade aprovada
```

---

# 35. BLOQUEADORES DE GO-LIVE

Exemplos:

```text
falha de login
falha de publicação
Editor acessando instituição indevida
busca exibindo rascunho
uploads indisponíveis
links essenciais quebrados
problema crítico mobile
problema crítico de acessibilidade
integração essencial sem funcionamento
health crítico em vermelho
```

---

# 36. COMUNICAÇÃO DE PRODUÇÃO

Antes do go-live deverão estar definidos:

```text
data da virada
responsável técnico
responsável editorial
quem valida conteúdo
quem autoriza rollback
```

---

# 37. PÓS-GO-LIVE

Após a troca, monitorar:

```text
erros 404
logs Nginx
erros API
jobs falhos
buscas sem resultado
Matomo
uso de recursos
```

---

# 38. SEM EDIÇÃO DIRETA EM PRODUÇÃO

Fluxo obrigatório:

```text
código
↓
GitHub
↓
CI
↓
staging
↓
production
```

Evitar:

```text
SSH
↓
editar arquivos manualmente em produção
```

salvo situação excepcional e documentada.

---

# 39. FLUXO EDITORIAL APÓS A VIRADA

Após o go-live:

```text
ADMIN cria estrutura quando necessário
↓
EDITOR trabalha conteúdo
↓
Preview
↓
Publicação
```

---

# 40. ROLLBACK DE CONTEÚDO

Como o novo sistema possui versionamento, conteúdo publicado poderá ser analisado historicamente.

Na V1, restauração automática de PageVersion não é obrigatória, mas o histórico facilita recuperação manual.

---

# 41. ROLLBACK DE APLICAÇÃO

A versão da aplicação deverá poder retornar para imagem anterior conforme a arquitetura de deployment.

---

# 42. DADOS DERIVADOS

Após rollback ou recuperação, estruturas derivadas poderão ser reconstruídas.

Exemplo:

```text
REBUILD_SEARCH_INDEX
```

---

# 43. BACKUP

O novo portal deverá estar contemplado pelas rotinas institucionais já existentes:

```text
backup diário
+
backup em fita
```

---

# 44. COMPONENTES A CONTEMPLAR

Garantir cobertura de:

```text
PostgreSQL
MinIO
Matomo
configurações necessárias
```

---

# 45. DOCUMENTAÇÃO OPERACIONAL

Deverá existir runbook com:

```text
como fazer deploy
como validar health
como reverter
como verificar logs
como reconstruir busca
como reiniciar worker
como validar integrações
```

---

# 46. DECISÃO CENTRAL

> **Não haverá projeto de migração automática do site atual. O novo Portal FUMEP será construído, alimentado e validado paralelamente. Somente conteúdos considerados relevantes serão recriados manualmente no novo modelo. O portal atual continuará disponível até a homologação completa e a virada controlada para produção.**

---

# 47. ARQUITETURA RESUMIDA

```text
                PORTAL ATUAL
                     │
                     │ continua no ar
                     │
                     ▼
              NOVO PORTAL FUMEP
                     │
                     ▼
                DEVELOPMENT
                     │
                     ▼
                  STAGING
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
      conteúdo     testes     revisão
       manual        QA       editorial
          │          │          │
          └──────────┼──────────┘
                     ▼
                aprovação
                     │
                     ▼
                  GO-LIVE
                     │
                     ▼
                PRODUCTION
                     │
              monitoramento
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
     sucesso                   problema
        │                         │
        ▼                         ▼
novo portal segue           rollback
operacional                 portal antigo
```

---

# 48. DECISÕES CONSOLIDADAS

Ficam definidas para Implantação e Transição V1:

```text
Sem migração automática

Portal atual continua em produção
durante o desenvolvimento

Novo portal em ambiente separado

Staging obrigatório para transição

Staging não indexável

Conteúdo recriado manualmente

Apenas conteúdo relevante entra no novo portal

Documentos sem importação em massa

Cursos cadastrados no novo modelo

Estágio reconstruído no novo modelo

Processos/concursos via integração

Checklists editorial, técnico e acessibilidade

Validação light/dark por instituição

Validação responsiva

Redirect 301 apenas quando houver equivalente

404 aceitável para conteúdo sem substituto

Auditoria de links

Freeze editorial curto antes do go-live

Troca controlada por Nginx/DNS

Preferência por troca via Nginx quando possível

Portal antigo mantido temporariamente

Rollback disponível

Go-live bloqueado por erros críticos

Monitoramento pós-go-live

Sem edição manual rotineira em produção

Runbook operacional
```

---

# 49. STATUS

Com este documento, a camada de **Implantação e Transição para Produção da Arquitetura Técnica V1** é considerada definida.

As decisões deverão orientar posteriormente:

- configuração de staging;
- checklists;
- estrutura inicial de páginas;
- cadastro manual de conteúdo;
- Redirect;
- validação editorial;
- validação técnica;
- go-live;
- rollback;
- runbook;
- monitoramento pós-produção.
