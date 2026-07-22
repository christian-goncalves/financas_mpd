# Registro de Execuções n8n

Este documento preserva evidências operacionais. Ele não define o contrato nem a próxima tarefa. A especificação vigente está em [N8N_WEBHOOKS.md](N8N_WEBHOOKS.md), e o plano executável está em [MVP.md](../tasks/MVP.md).

## Geração mensal conectada ao Google Sheets — 2026-07-21

- Workflow: `FINANCAS-MPD - Gerar contas mensais`.
- ID: `YZ70BdQtS7LPE72r`.
- Versão testada: `3e0c6887-a193-4550-a316-33aeb12099e6`.
- Estado após os testes: não publicado, `active: false`.
- Agenda: diariamente às `06:00`, em `America/Sao_Paulo`.
- Competência processada no teste: `2026-08`, mês seguinte à execução.
- Fontes: `cotacoes_mensais`, `despesas_config` e `contas_mensais`.
- Destino: `contas_mensais`.

| Cenário | Resultado | Execução |
|---|---|---|
| Validação inicial do ramo condicional | Falhou antes da escrita por incompatibilidade de tipo no IF; configuração corrigida | `6753` |
| Primeira geração | Três despesas ativas geraram três contas; uma despesa inativa foi ignorada | `6754` |
| Repetição | Três chaves existentes encontradas; zero linhas gravadas | `6755` |

A execução `6754` criou temporariamente:

- `conta_2026_08_desp_christian_001`, vencimento `2026-08-16`, ARS `42800`, BRL `171.20`;
- `conta_2026_08_desp_dia_a_dia_001`, vencimento `2026-08-21`, ARS `21900`, BRL `87.60`;
- `conta_2026_08_desp_christian_002`, vencimento `2026-08-28`, ARS `35400`, BRL `141.60`.

Todas usaram `cotacao_usada = 250`, moedas normalizadas para ARS/BRL e status `pendente`. A execução `6755` confirmou idempotência por `despesa_id + competencia`: o nó de escrita não executou e `appended_rows` foi `0`.

Após os testes, somente as três linhas criadas pela execução `6754` foram removidas. A leitura final de `contas_mensais!A1:N6` confirmou as quatro linhas fictícias originais de `2026-07`, seus valores, estados e validações, sem ocorrência residual de `2026-08`. As três linhas vazias foram repostas no final da grade, restaurando também suas 1000 linhas originais.

## Ignorar conectado ao Google Sheets — 2026-07-21

- Workflow: `FINANCAS-MPD - API - Ignorar conta`.
- ID: `ignoreMpdMock26A1`.
- Versão testada: `9064a90b-f808-4965-bef0-cac826058ba6`.
- Estado após os testes: não publicado, `active: false`.
- A leitura e a escrita usam `contas_mensais`.
- A escrita corresponde somente a `status`, `ignorada_em` e `atualizado_em`, usando `conta_id` como chave.
- O payload aceita somente `conta_id`; campos operacionais extras são rejeitados antes da leitura.

| Cenário | Resultado | Execução |
|---|---|---|
| Conta pendente elegível | `200`, status `ignorada` e persistência confirmada | `6741` |
| Repetição da conta ignorada | `200`, nó de escrita não executado e timestamps preservados | `6742` |
| Conta adiada elegível | `200`, status `ignorada` e persistência confirmada | `6743` |
| Repetição da conta adiada já ignorada | `200`, nó de escrita não executado e timestamps preservados | `6744` |
| Body ausente | `400 VALIDATION_ERROR`, sem escrita | `6745` |
| `conta_id` vazio | `422 VALIDATION_ERROR`, sem escrita | `6746` |
| Campo operacional extra | `422 VALIDATION_ERROR`, sem escrita | `6747` |
| ID inexistente | `404 ACCOUNT_NOT_FOUND`, sem escrita | `6748` |
| Conta cancelada | `409 INVALID_STATE`, sem escrita | `6749` |
| Token ausente | `401 UNAUTHORIZED` | `6750` |
| Token inválido | `401 UNAUTHORIZED` | `6751` |
| Leitura após restauração da massa fictícia | `200`, três contas e resumo `1/1/1` | `6752` |

As duas linhas modificadas foram restauradas em uma única operação: a primeira voltou a `pendente`, a terceira voltou a `adiada`, `ignorada_em` voltou a vazio, `adiada_para` permaneceu em `2026-07-30` e os timestamps originais foram repostos. As validações de status foram preservadas.

O ramo de sucesso foi testado com contexto autorizado controlado para não revelar o Bearer token. A autenticação real permaneceu inalterada; token ausente e inválido foram exercitados pelo ramo real de autenticação.

## Adiamento conectado ao Google Sheets — 2026-07-21

- Workflow: `FINANCAS-MPD - API - Adiar conta`.
- ID: `postponeMock26A1`.
- Versão testada: `12f614e2-2c06-4af9-bc7a-28e5dffa2687`.
- Estado após os testes: não publicado, `active: false`.
- A leitura e a escrita usam `contas_mensais`.
- A escrita corresponde somente a `status`, `adiada_para` e `atualizado_em`, usando `conta_id` como chave.
- A data é validada no fuso `America/Sao_Paulo` antes da leitura e da escrita.

| Cenário | Resultado | Execução |
|---|---|---|
| Conta pendente e data futura válida | `200`, status `adiada` e persistência confirmada | `6729` |
| Repetição da mesma data | `200`, nó de escrita não executado e timestamp preservado | `6730` |
| Data anterior ao processamento | `422 VALIDATION_ERROR`, sem escrita | `6731` |
| Data civil inexistente | `422 VALIDATION_ERROR`, sem escrita | `6732` |
| Data ausente | `422 VALIDATION_ERROR`, sem escrita | `6733` |
| ID inexistente | `404 ACCOUNT_NOT_FOUND`, sem escrita | `6734` |
| Conta cancelada | `409 INVALID_STATE`, sem escrita | `6735` |
| Conta já adiada alterada para nova data | `200`, nova data persistida | `6736` |
| Repetição da nova data | `200`, nó de escrita não executado e timestamp preservado | `6737` |
| Token ausente | `401 UNAUTHORIZED` | `6738` |
| Token inválido | `401 UNAUTHORIZED` | `6739` |
| Leitura após restauração da massa fictícia | `200`, três contas e resumo `1/1/1` | `6740` |

As duas linhas modificadas foram restauradas em uma única operação: a primeira voltou a `pendente`, a terceira voltou a `adiada` para `2026-07-30` e os timestamps originais foram repostos. A leitura posterior confirmou as validações de status, os valores originais e o resumo `1/1/1`.

O ramo de sucesso foi testado com contexto autorizado controlado para não revelar o Bearer token. A autenticação real permaneceu inalterada; token ausente e inválido foram exercitados pelo ramo real de autenticação.

## Pagamento conectado ao Google Sheets — 2026-07-21

- Workflow: `FINANCAS-MPD - API - Pagar contas`.
- ID: `payMpdMock2026A1`.
- Versão testada: `308b8ace-e85c-41c2-b40f-e8c07506511b`.
- Estado após os testes: não publicado, `active: false`.
- A leitura usa `contas_mensais` e a escrita corresponde somente a `status`, `pago_em` e `atualizado_em`.
- A validação de todos os IDs ocorre antes da escrita.
- O nó Google Sheets recebe todas as linhas elegíveis na mesma execução e realiza uma única chamada batch.
- Listar, Adiar e Ignorar permaneceram inalterados durante a implementação do pagamento.

| Cenário | Resultado | Execução |
|---|---|---|
| `conta_ids` vazio | `422 VALIDATION_ERROR`, sem escrita | `6720` |
| ID inexistente | `404 ACCOUNT_NOT_FOUND`, sem escrita | `6721` |
| Conta pendente combinada com cancelada | `409 INVALID_STATE`, nó de escrita não executado | `6722` |
| Dois IDs elegíveis, com duplicata no payload | `200`, dois IDs normalizados e `updated_count: 2` | `6723` |
| Repetição das duas contas já pagas | `200`, `updated_count: 0`, sem regravar timestamps | `6724` |
| Uma conta já paga e uma adiada | `200`, somente a adiada alterada e `updated_count: 1` | `6725` |
| Token ausente | `401 UNAUTHORIZED` | `6726` |
| Token inválido | `401 UNAUTHORIZED` | `6727` |
| Leitura após restauração da massa fictícia | `200`, três contas e resumo `1/1/1` | `6728` |

Evidências adicionais:

- Antes do teste válido, a leitura direta confirmou que o cenário `409` não havia alterado a conta pendente.
- A execução `6723` enviou dois itens ao mesmo nó de atualização e ambos receberam exatamente o mesmo timestamp.
- A execução `6724` não executou o nó de escrita e preservou `pago_em` e `atualizado_em`.
- A massa fictícia foi restaurada depois dos testes: as duas primeiras contas voltaram a `pendente`, a terceira voltou a `adiada`, `pago_em` voltou a vazio e os timestamps originais foram repostos.
- A restauração preservou as validações de status e não alterou `adiada_para` nem outras colunas.
- A execução `6728` confirmou pelo workflow de listagem que a base restaurada voltou a produzir uma conta Vencida, uma de Hoje e uma Próxima.

O ramo de sucesso foi testado com contexto autorizado controlado para não revelar o Bearer token. A lógica real de autenticação permaneceu inalterada; token ausente e inválido foram novamente comprovados após a integração.

## GET conectado ao Google Sheets — 2026-07-21

- Workflow: `FINANCAS-MPD - API - Listar contas`.
- ID: `y7rZUq2Ykn50Y5HC`.
- Versão testada: `ceb8788c-1405-4c84-a09d-3009551ca6b9`.
- Estado após os testes: não publicado, `active: false`.
- Nós adicionados: `Google Sheets - Ler contas_mensais` e `Google Sheets - Ler despesas_config`.
- O antigo gerador mock foi substituído por `Code - Montar resposta da planilha`.
- Pagar, Adiar e Ignorar permaneceram inalterados e não publicados.

| Cenário | Resultado | Execução |
|---|---|---|
| Leitura persistente com contexto autorizado controlado | `200`, três contas e resumo `1/1/1` | `6716` |
| Token ausente | `401 UNAUTHORIZED` | `6717` |
| Token inválido | `401 UNAUTHORIZED` | `6718` |
| Repetição da leitura | `200`, mesmo conjunto sem alteração de estado | `6719` |

A execução `6716` leu quatro linhas de `contas_mensais` e quatro linhas de `despesas_config`. A resposta final:

- manteve duas contas `pendente` e uma `adiada`;
- excluiu a ocorrência `cancelada` e a despesa inativa;
- calculou uma Vencida, uma de Hoje e uma Próxima;
- usou `adiada_para` como data efetiva da conta adiada;
- não retornou `row_number`, `despesa_id`, `competencia`, `cotacao_usada` ou timestamps internos.

O ramo Google Sheets foi executado com contexto autorizado controlado para não revelar o Bearer token. A lógica real de autenticação não foi alterada; após a integração, token ausente e inválido foram novamente comprovados. O Bearer válido já possuía evidência anterior no mock, execução `6677`.

## Credencial Google Sheets — 2026-07-21

Diagnóstico read-only executado pelo MCP do n8n, sem criar ou alterar workflows:

- Credencial encontrada: `Google Sheets account`.
- Tipo: `googleSheetsOAuth2Api`.
- A credencial localizou a planilha `FINANCAS-MPD - MVP - Base de Teste` pelo ID registrado no modelo de dados.
- A planilha devolveu as abas `despesas_config`, `contas_mensais` e `notificacoes`, além das abas preexistentes fora do escopo desta integração.
- A leitura de metadados devolveu todos os oito cabeçalhos esperados de `despesas_config`.
- A leitura de metadados devolveu todos os quatorze cabeçalhos esperados de `contas_mensais`.
- Nenhum valor de token, OAuth ou segredo foi exibido ou registrado.
- Nenhum workflow, célula, credencial ou configuração foi alterado.

Veredito registrado naquele momento: a credencial possuía acesso suficiente para iniciar `GET /api/accounts`; a autorização foi concedida posteriormente e a integração está documentada acima.

## Estado consolidado em 2026-07-20

- Os quatro workflows foram salvos e validados somente em modo de teste.
- Nenhum workflow estava publicado.
- Nenhum workflow acessava Google Sheets ou Evolution API.
- Os mocks eram stateless e limitados a `conta_mock_001`, `conta_mock_002` e `conta_mock_003`.
- As URLs públicas `/api/*`, proxy e validação do PWA em modo API não haviam sido executados.

## Ambiente validado

- Host n8n: `https://n8n.autamacao.shop`.
- `FINANCAS_PWA_TOKEN`: presente no container e com 64 caracteres; valor não registrado.
- `FINANCAS_ALLOWED_ORIGIN`: `http://127.0.0.1:8000` no ambiente de teste.
- `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` durante os testes dos mocks.
- Foram observados `Content-Type: application/json`, `Cache-Control: no-store`, CORS restrito, `Vary: Origin` e ausência do token nas respostas.

Esses valores descrevem o ambiente observado na data do teste e devem ser confirmados novamente antes de produção.

## GET `/api/accounts`

- Workflow: `FINANCAS-MPD - API - Listar contas mock`.
- ID: `y7rZUq2Ykn50Y5HC`.
- URL testada: `https://n8n.autamacao.shop/webhook-test/api/accounts`.

| Cenário | Resultado | Execução |
|---|---|---|
| Bearer válido | `200`, três contas e resumo `1/1/1` | `6677` |
| Token ausente | `401 UNAUTHORIZED` | `6678` |
| Token inválido | `401 UNAUTHORIZED` | `6679` |

O GET repetido não alterou estado.

## POST `/api/accounts/pay`

- Workflow: `FINANCAS-MPD - API - Pagar contas mock`.
- ID: `payMpdMock2026A1`.
- URL testada: `https://n8n.autamacao.shop/webhook-test/api/accounts/pay`.

| Cenário | Resultado | Execução |
|---|---|---|
| Dois IDs válidos | `200`, status `paga`, `updated_count: 2` | `6680` |
| Repetição do payload | `200`, mesmo resultado semântico | `6681` |
| ID duplicado | `200`, IDs normalizados | `6682` |
| Lista vazia | `422 VALIDATION_ERROR` | `6683` |
| Item de tipo inválido | `422 VALIDATION_ERROR` | `6684` |
| ID válido e desconhecido | `404 ACCOUNT_NOT_FOUND`, sem sucesso parcial | `6685` |
| Token ausente | `401 UNAUTHORIZED` | `6686` |
| Token inválido | `401 UNAUTHORIZED` | `6687` |

Como o mock era stateless, esses testes não comprovam escrita batch nem a nova semântica persistente de `updated_count: 0` para repetição totalmente idempotente.

## POST `/api/accounts/postpone`

- Workflow: `FINANCAS-MPD - API - Adiar conta mock`.
- ID: `postponeMock26A1`.
- URL testada: `https://n8n.autamacao.shop/webhook-test/api/accounts/postpone`.

| Cenário | Resultado | Execução |
|---|---|---|
| ID conhecido e data futura | `200`, status `adiada` | `6688` |
| Repetição do payload | `200`, mesmo resultado semântico | `6689` |
| `conta_id` ausente | `422 VALIDATION_ERROR` | `6690` |
| `adiada_para` ausente | `422 VALIDATION_ERROR` | `6691` |
| Formato de data inválido | `422 VALIDATION_ERROR` | `6692` |
| Data civil inexistente | `422 VALIDATION_ERROR` | `6693` |
| Data anterior | `422 VALIDATION_ERROR` | `6694` |
| ID desconhecido | `404 ACCOUNT_NOT_FOUND` | `6695` |
| Token ausente | `401 UNAUTHORIZED` | `6696` |
| Token inválido | `401 UNAUTHORIZED` | `6697` |

## POST `/api/accounts/ignore`

- Workflow: `FINANCAS-MPD - API - Ignorar conta mock`.
- ID: `ignoreMpdMock26A1`.
- URL testada: `https://n8n.autamacao.shop/webhook-test/api/accounts/ignore`.

| Cenário | Resultado | Execução |
|---|---|---|
| ID conhecido | `200`, status `ignorada` | `6698` |
| Repetição do payload | `200`, mesmo resultado semântico | `6699` |
| Body ausente | `400 VALIDATION_ERROR` | `6700` |
| `conta_id` ausente | `422 VALIDATION_ERROR` | `6701` |
| Tipo inválido | `422 VALIDATION_ERROR` | `6702` |
| Campo operacional proibido | `422 VALIDATION_ERROR` | `6703` |
| ID desconhecido | `404 ACCOUNT_NOT_FOUND` | `6704` |
| Token ausente | `401 UNAUTHORIZED` | `6705` |
| Header malformado | `401 UNAUTHORIZED` | `6706` |
| Token inválido | `401 UNAUTHORIZED` | `6707` |

## Limitação observada

Um JSON sintaticamente malformado com `Content-Type: application/json` foi interceptado pelo parser global do n8n antes do workflow e recebeu `422` fora do envelope contratado. O cenário de `400` foi comprovado usando body ausente. Antes da exposição pública, o comportamento de JSON malformado deve ser validado no conjunto n8n/proxy.

## Evidência ainda necessária

- Publicação dos workflows e URLs nativas de produção.
- Proxy `/api/*`, preflight e CORS final.
- Fluxo do PWA em modo API.

## Provisionamento do token final

- Data: 2026-07-21 12:26:25 (`America/Sao_Paulo`).
- Serviço: n8n gerenciado pelo EasyPanel e executado no Docker Swarm.
- Variável: `FINANCAS_PWA_TOKEN`.
- Formato verificado: 64 caracteres hexadecimais, equivalentes a 256 bits aleatórios.
- Persistência verificada entre o registro do serviço no EasyPanel, a especificação do Swarm e o container n8n em execução.
- O valor do token e qualquer derivado reutilizável não foram exibidos nem registrados.
- A atualização utilizou a ordem `start-first`; uma primeira verificação incompleta acionou rollback automático e preservou o valor anterior. A segunda execução verificou todos os containers concorrentes e concluiu a rotação.
- Os workflows não foram publicados e não houve teste de URL de produção. A aceitação do token novo e a rejeição do anterior por HTTP serão comprovadas na etapa de publicação.
- Procedimento de rotação e revogação: [ACCESS_TOKEN.md](ACCESS_TOKEN.md).

## Política de retenção dos workflows da API

- Data: 2026-07-21 12:33:04 (`America/Sao_Paulo`).
- Escopo: somente os quatro workflows `FINANCAS-MPD - API`.
- Configuração aplicada e confirmada por leitura de retorno:
  - `saveDataSuccessExecution: none`;
  - `saveDataErrorExecution: none`;
  - `saveManualExecutions: false`;
  - `saveExecutionProgress: false`.
- IDs verificados: `y7rZUq2Ykn50Y5HC`, `payMpdMock2026A1`, `postponeMock26A1` e `ignoreMpdMock26A1`.
- Todos permaneceram `active: false`; nenhum workflow foi publicado e nenhum nó foi alterado.
- O token final não foi enviado em execução durante esta tarefa.
- A retenção global da instância não foi alterada, evitando impacto sobre workflows de outros projetos.

## Publicação dos quatro workflows da API

- Data: 2026-07-21 12:41:42 (`America/Sao_Paulo`).
- Os quatro workflows foram publicados com as mesmas versões validadas e mantiveram a política de não retenção.

| Workflow | ID | Versão ativa | Rota nativa |
|---|---|---|---|
| Listar contas | `y7rZUq2Ykn50Y5HC` | `8e4960d7-7d10-487d-afca-ac4144dbdb1f` | `GET /webhook/api/accounts` |
| Pagar contas | `payMpdMock2026A1` | `eb2ba883-bddf-446a-99a6-b74ced985c37` | `POST /webhook/api/accounts/pay` |
| Adiar conta | `postponeMock26A1` | `87b90ba6-e2ce-4520-a3c1-f412771c9c2b` | `POST /webhook/api/accounts/postpone` |
| Ignorar conta | `ignoreMpdMock26A1` | `9064a90b-f808-4965-bef0-cac826058ba6` | `POST /webhook/api/accounts/ignore` |

### Testes nativos de produção

- GET com Bearer válido: `200`, três contas e resumo `1/1/1`.
- GET sem token: `401 UNAUTHORIZED`.
- GET com token inválido: `401 UNAUTHORIZED`.
- POST pagar com Bearer válido e body vazio: `422 VALIDATION_ERROR`, sem escrita.
- POST adiar com Bearer válido e body vazio: `422 VALIDATION_ERROR`, sem escrita.
- POST ignorar com Bearer válido e body vazio: `422 VALIDATION_ERROR`, sem escrita.
- Todas as respostas observadas usaram JSON e `Cache-Control: no-store`.
- A busca de execuções após os testes retornou zero registros para os quatro workflows, confirmando a política de não retenção.

As URLs sugeridas automaticamente pelo MCP com um UUID adicional retornaram `404`. As rotas efetivamente registradas e validadas são `/webhook/api/*`. Naquele momento, o proxy público ainda não havia sido configurado; sua implementação está registrada na seção seguinte.

## Proxy público `/api/*`

- Data: 2026-07-21 12:56:32 (`America/Sao_Paulo`).
- Implementação: configuração dinâmica do Traefik 3.6 em `/etc/easypanel/traefik/config/financas-mpd-api.yaml`.
- O arquivo fica no diretório persistente observado pelo file provider do EasyPanel e não altera o `main.yaml` gerado automaticamente.
- Os roteadores têm prioridade `10000` e correspondem somente aos quatro paths contratuais no host `n8n.autamacao.shop`.
- A reescrita usa `/api/...` → `/webhook/api/...` e preserva as rotas nativas.
- Como o TLS é terminado antes do servidor, os middlewares também foram aplicados ao entrypoint HTTP que recebe `X-Forwarded-Proto: https`.

### Testes do proxy

- `GET /api/accounts` com Bearer válido: `200`, três contas e resumo `1/1/1`.
- GET sem token: `401 UNAUTHORIZED`.
- Os três POSTs com Bearer válido e body vazio: `422 VALIDATION_ERROR`, sem escrita.
- `OPTIONS /api/accounts/pay` com origem Vercel: `200` vazio, métodos `GET, POST, OPTIONS` e headers `Authorization, Content-Type`.
- Preflight com origem não autorizada: resposta sem `Access-Control-Allow-Origin`.
- Path `/api/unknown`: não usou o roteador FINANCAS-MPD.
- Rota nativa `GET /webhook/api/accounts`: permaneceu `200`.
- Health check do n8n: permaneceu `200`.
- Nenhuma execução dos quatro workflows foi persistida após os testes.

### Pendência observada

Na validação inicial do proxy, as respostas sem `Origin` e para origem não autorizada ainda carregavam o valor legado `Access-Control-Allow-Origin: http://127.0.0.1:8000` gerado dentro dos workflows a partir de `FINANCAS_ALLOWED_ORIGIN`. O browser bloqueava a origem não correspondente. Essa pendência foi resolvida e validada na seção seguinte.

## CORS final

- Data: 2026-07-21 13:03:37 (`America/Sao_Paulo`).
- `FINANCAS_ALLOWED_ORIGIN` foi alterada de `http://127.0.0.1:8000` para `https://financas-mpd.vercel.app`.
- A mudança foi persistida no EasyPanel e propagada ao Docker Swarm e ao novo container n8n.
- O token permaneceu presente, com 64 caracteres e sem alteração de valor.
- A atualização do serviço terminou com estado `completed` e um único container em execução.

### Testes de CORS

- GET sem `Origin`: `200`, `Access-Control-Allow-Origin: https://financas-mpd.vercel.app` e três contas.
- GET com origem permitida: `200` e a mesma origem autorizada.
- GET com origem diferente: não recebeu autorização correspondente à origem solicitante; o header permaneceu fixo na origem Vercel.
- GET sem token e com origem permitida: `401 UNAUTHORIZED` com CORS correto.
- GET com token inválido e origem permitida: `401 UNAUTHORIZED` com CORS correto.
- Preflight da origem Vercel: `200` vazio, métodos `GET, POST, OPTIONS` e headers `Authorization, Content-Type`.
- Preflight de origem diferente: sem `Access-Control-Allow-Origin`.
- POST vazio com origem permitida: `422 VALIDATION_ERROR`, sem escrita.
- Health check: `200`.
- Os quatro workflows permaneceram publicados e não houve persistência das execuções de teste.

## Recebimento do token no PWA

- Data: 2026-07-21 13:12:21 (`America/Sao_Paulo`).
- O bootstrap `app/auth-session.js` foi carregado antes dos demais assets e validado sem usar o token real.
- Um token fictício no parâmetro `token` foi aceito, gravado somente em `sessionStorage` e removido imediatamente da URL, preservando outros parâmetros e o fragmento.
- A recarga na mesma sessão restaurou o valor; um link inválido limpou a sessão e apresentou mensagem segura.
- A verificação em navegador com 430 px renderizou seis cards, sem erros de console e sem requisições externas.
- `APP_MODE` permaneceu em `demo`; nenhum endpoint, workflow, planilha ou serviço externo foi chamado por esse teste.

## Configuração do PWA em modo API

- Data: 2026-07-21 13:35:39 (`America/Sao_Paulo`).
- `APP_MODE` foi alterado para `api` e `API_BASE_URL` foi definida como `https://n8n.autamacao.shop/api`.
- O token continua ausente dos assets e é lido em tempo de execução da sessão criada pelo magic link.
- Sem token, o navegador não iniciou requisição e exibiu orientação segura.
- Com token exclusivamente fictício e resposta interceptada, o PWA chamou `GET /api/accounts` com Bearer, sem cookies ou `Referer`, e renderizou três contas com resumo `1/1/1`.
- Um nome contendo marcação HTML foi exibido como texto, sem criar elemento executável.
- Nenhum endpoint real, workflow ou dado persistente foi acessado naquela validação simulada; os quatro fluxos publicados foram exercitados posteriormente, conforme a seção seguinte.

## Validação do PWA contra os endpoints publicados

- Data: 2026-07-21 15:08:27 (`America/Sao_Paulo`).
- Deployment de produção: `dpl_B2MhrNhVeuHdpYGwefmT3ATg8aX2`, estado `READY`, alias `https://financas-mpd.vercel.app`.
- O teste foi executado em navegador com 430 px e token mantido somente em memória; seu valor não foi exibido ou persistido.
- O magic link foi sanitizado e a listagem retornou três cards com nomes fictícios permitidos e resumo `1/1/1`.

| Fluxo pelo PWA | Conta fictícia | Resultado |
|---|---|---|
| Listar | três contas exibíveis | `GET /api/accounts` → `200` |
| Adiar | `conta_teste_2026_07_001` | `POST /api/accounts/postpone` → `200`; status `adiada`, data `2026-07-28` |
| Ignorar | `conta_teste_2026_07_002` | `POST /api/accounts/ignore` → `200`; status `ignorada` |
| Pagar | `conta_teste_2026_07_003` | `POST /api/accounts/pay` → `200`; status `paga` |

- As quatro respostas tiveram CORS para `https://financas-mpd.vercel.app`; as requisições não enviaram cookies ou `Referer`.
- A planilha confirmou os três estados e seus timestamps após as ações.
- `contas_mensais!J2:N4` foi restaurado em uma única operação aos valores originais: `pendente`, `pendente`, `adiada`, `adiada_para = 2026-07-30` na terceira conta, timestamps originais e demais campos vazios.
- A restauração preservou validação e formatação. A leitura final pelo PWA retornou novamente três cards e resumo `1/1/1`.
- A busca desde `2026-07-21T18:00:00Z` retornou zero execuções armazenadas nos quatro workflows, confirmando a política de não retenção.
- Não houve acesso à Evolution API nem alteração dos workflows.

## Início da Fase 4 — Evolution API e lembretes

- Data: 2026-07-21 (`America/Sao_Paulo`).
- A credencial `Evolution account`, do tipo `evolutionApi`, foi localizada no n8n sem leitura ou exposição do segredo.
- Uma execução preexistente do workflow `WhatsApp | Buscar todos os Grupos` confirmou o funcionamento da credencial.
- A instância operacional do FINANCAS-MPD foi confirmada como `8611`, em estado `open`.
- O grupo `FINANÇAS | MPD` foi validado na instância `8611` pelo `groupJid` `120363429681130867@g.us`; a consulta retornou HTTP `200` e dois participantes.
- Um envio simples e controlado, sem dados financeiros, foi aceito com HTTP `201`, `fromMe = true` e o `remoteJid` esperado. O identificador da mensagem não foi persistido na documentação.
- O primeiro transporte direto do texto de teste codificou caracteres Unicode incorretamente. A mensagem foi reenviada com UTF-8 explícito e escapes Unicode seguros; a consulta posterior por mensagem retornou HTTP `200`, encontrou o registro e confirmou correspondência exata do texto armazenado, incluindo acentos e o símbolo de confirmação.
- Foi criado o workflow `FINANCAS-MPD - Lembretes consolidados diários`, ID `yQgTRvFBZvvsYKXs`, com seis nós e credenciais autoatribuídas para Google Sheets e Evolution API.
- O workflow foi validado nó a nó e como grafo completo, sem erros ou avisos, e permanece inativo e não publicado.
- A execução diária está configurada para `08:00` em `America/Sao_Paulo`; a retenção de sucesso, erro, execução manual e progresso por nó está desabilitada.
- O workflow diário não foi executado nesta etapa, pois a massa fictícia contém um lembrete elegível e o registro em `notificacoes` e a prevenção de duplicidade ainda não foram implementados.

## Fase 4 — Classificação das etapas de lembrete

- Data: 2026-07-21 (`America/Sao_Paulo`).
- Workflow: `FINANCAS-MPD - Lembretes consolidados diários`, ID `yQgTRvFBZvvsYKXs`.
- Checkpoint anterior: versão `20a70ae3-03ff-4f42-94cd-00439b854774`.
- Versão após a alteração: `d256ed1b-1243-48e7-b456-7026e094d047`.
- Somente o código do nó `Code - Preparar lembrete consolidado` foi alterado.
- A regra usa `vencimento` para `pendente`, `adiada_para` para `adiada` e o fuso `America/Sao_Paulo`.
- O teste fictício classificou `D-5: 1`, `D-2: 2` — incluindo uma conta adiada —, `D-1: 1`, `D0: 1` e `D+1: 1`.
- Contas `paga`, `ignorada` e `cancelada` e uma despesa inativa foram excluídas.
- Data civil impossível, ausência de `adiada_para`, referência inválida, duplicidade de IDs e valores inválidos passaram a interromper a preparação com erro seguro.
- O nó foi validado pelo schema do n8n e a atualização não gerou avisos.
- O workflow permaneceu inativo; Google Sheets, Evolution API e o nó de envio não foram executados ou alterados.

## Fase 4 — Registro do resultado em notificacoes

- Data: 2026-07-21 (`America/Sao_Paulo`).
- Workflow: `FINANCAS-MPD - Lembretes consolidados diários`, ID `yQgTRvFBZvvsYKXs`.
- Checkpoint anterior: versão `d256ed1b-1243-48e7-b456-7026e094d047`.
- Versão após a alteração: `6477b653-8d1a-4645-b0c6-38181bf933c7`.
- Foram adicionados `Code - Registros enviados`, `Code - Registros com erro` e `Google Sheets - Registrar notificacoes`.
- O nó Evolution passou a encaminhar falhas pela saída de erro, sem repetição automática nesta etapa.
- Cada conta e etapa da tentativa gera uma linha com o schema canônico `notificacao_id, conta_id, etapa, enviada_em, canal, status_envio`.
- O ID usa execução, sequência, conta e etapa; o teste local confirmou duas linhas únicas para sucesso e duas para erro, todas com exatamente os seis campos esperados.
- A ramificação de sucesso usa `enviada`; a ramificação de falha usa `erro`; o canal é sempre `whatsapp`.
- O append aponta somente para a aba `notificacoes`, `sheetId = 766508880`, usando a credencial Google Sheets já confirmada.
- A atualização atômica aplicou oito operações e não gerou avisos de validação.
- O workflow permaneceu inativo e não publicado. Nenhuma mensagem foi enviada e nenhuma linha foi gravada no Google Sheets neste checkpoint.

## Fase 4 — Prevenção de reenvio duplicado

- Data: 2026-07-21 (`America/Sao_Paulo`).
- Workflow: `FINANCAS-MPD - Lembretes consolidados diários`, ID `yQgTRvFBZvvsYKXs`.
- Checkpoint anterior: versão `6477b653-8d1a-4645-b0c6-38181bf933c7`.
- Versão final após a alteração: `9a6cc34f-5ffb-4f98-ae9f-24d8bbaafcae`.
- Foi adicionado `Google Sheets - Ler notificacoes` entre a leitura de contas e a preparação do consolidado.
- O nó lê `sheetId = 766508880`, executa uma vez e mantém uma saída vazia quando ainda não existem registros.
- A chave de deduplicação é `conta_id + etapa + canal` e somente `status_envio = enviada` no canal `whatsapp` bloqueia o candidato.
- O teste fictício bloqueou `conta_a|D0|whatsapp` por sucesso anterior.
- O mesmo teste permitiu nova tentativa após erro, em etapa diferente e em canal diferente.
- Quando não existe histórico, todos os candidatos permanecem elegíveis.
- A atualização final não gerou avisos; o workflow permaneceu inativo e não publicado.
- Nenhuma mensagem foi enviada e nenhuma linha do Google Sheets foi lida ou alterada durante o teste local.

## Fase 4 — Teste controlado de falha de envio

- Data: 2026-07-21 (`America/Sao_Paulo`).
- Workflow: `FINANCAS-MPD - Lembretes consolidados diários`, ID `yQgTRvFBZvvsYKXs`.
- Versão final após restaurar a configuração operacional: `a038a418-b115-472b-adfe-cf78167a8293`.
- O snapshot inicial confirmou `conta_teste_2026_07_002` como `pendente`, sem `pago_em`, e a aba `notificacoes` sem registros.
- Na primeira tentativa, a alteração temporária do nó Evolution foi rejeitada, mas a execução manual `6790` foi iniciada com a configuração original. O lembrete foi enviado ao grupo autorizado e registrado como `enviada`. Esse efeito não planejado é preservado neste log para rastreabilidade.
- A execução controlada `6791` usou uma instância Evolution inexistente e entradas fictícias fixadas nos nós de leitura. A saída de erro foi processada e gerou `notif_6791_001_conta_teste_2026_07_002_D0` com `status_envio = erro`.
- A instância operacional `8611` foi restaurada imediatamente após o teste; o workflow permaneceu inativo e não publicado.
- A comparação de `contas_mensais!A1:N20` antes e depois foi idêntica. A conta permaneceu `pendente`, `pago_em` permaneceu vazio e `atualizado_em` não mudou.
- A execução manual `6792`, já com a configuração operacional, não criou nova linha em `notificacoes`: o registro anterior `enviada` bloqueou a mesma combinação `conta_id + etapa + canal` antes do envio.
- O teste confirmou que a falha é registrada sem alterar o estado financeiro e que um registro `erro` não invalida o bloqueio produzido por um envio bem-sucedido anterior.

## Fase 4 — Publicação do workflow diário de lembretes

- Data: 2026-07-21 (`America/Sao_Paulo`).
- Workflow: `FINANCAS-MPD - Lembretes consolidados diários`, ID `yQgTRvFBZvvsYKXs`.
- Versão publicada: `a038a418-b115-472b-adfe-cf78167a8293`, a mesma validada após o teste de falha.
- A publicação foi executada após autorização explícita e retornou sucesso.
- A verificação posterior confirmou `active = true`, `activeVersionId` igual à versão publicada e um único gatilho ativo.
- O agendamento permanece diário às `08:00` com timezone `America/Sao_Paulo`.
- A instância Evolution permaneceu `8611` e o grupo autorizado permaneceu inalterado.
- Nenhuma execução manual, alteração de dados, mudança no PWA ou modificação de outro workflow foi realizada durante a publicação.

## Fase 5 — Cadastro da massa controlada

- Data: 2026-07-21 (`America/Sao_Paulo`).
- Fonte manual preservada: `transacoes`, com 18 despesas e total de ARS `2.493.545`.
- `despesas_config` recebeu 18 despesas recorrentes ativas: 9 profissionais, 9 pessoais, 12 manuais e 6 em débito automático.
- `contas_mensais` recebeu 18 ocorrências para `2026-07`, todas com IDs únicos, referências válidas, vencimentos derivados e status `pendente`.
- A cotação mensal foi corrigida para `290 ARS/BRL` em julho e agosto; as contas de julho foram recalculadas para o total convertido de BRL `8.598,43`.
- `notificacoes` permaneceu somente com o cabeçalho, sem registros artificiais; `transacoes` permaneceu intacta.
- A releitura confirmou cabeçalhos, validações, formatos, 18 pares únicos de `despesa_id + competencia` e ausência da massa fictícia anterior.

## Fase 5 — Teste do fluxo operacional

- Data: 2026-07-21 (`America/Sao_Paulo`).
- Baseline: 18 despesas ativas, 18 contas pendentes de julho, cotação `290 ARS/BRL` para julho e agosto e `notificacoes` somente com cabeçalho.
- A execução manual `6793` do workflow de geração mensal criou exatamente 18 contas de `2026-08`, todas pendentes, com IDs únicos, referências válidas, cotação `290` e total de ARS `2.493.545` / BRL `8.598,43`.
- A repetição `6794` encontrou as 18 ocorrências existentes e retornou `appended_rows = 0`; a planilha permaneceu com 36 contas, 18 por competência.
- A releitura direta confirmou os cabeçalhos e as validações de moeda e status também nas novas linhas.
- A execução manual `6796` do workflow diário enviou um consolidado real ao grupo autorizado e registrou três notificações com status `enviada`: Automóvel seguro (`D+1`), Seguro de mala praxis (`D0`) e Arca | Monotributo | ingresos brutos (`D-1`).
- A repetição `6797` não adicionou registros nem reenviou as mesmas combinações de conta, etapa e canal; `notificacoes` permaneceu com exatamente três linhas.
- Como a retenção de execuções manuais está desabilitada no workflow de lembretes, a prova persistente é o ID `6796` incorporado aos três `notificacao_id` e a ausência de linhas da execução `6797`.
- A PWA publicada foi aberta em viewport móvel de 430 x 932 sem sessão: exibiu a orientação para uso do link de acesso, não apresentou contas e manteve as ações desabilitadas.
- A rota pública `GET /api/accounts` sem Bearer token respondeu `401`, confirmando a barreira de autenticação sem leitura de dados.
- O ambiente desta execução não possuía `FINANCAS_PWA_TOKEN` nem magic link válido. Para não extrair, expor ou persistir o segredo, listagem autenticada e ações reais de pagar, adiar e ignorar não foram executadas nesta rodada.
- Nenhum workflow, credencial, API ou cabeçalho estrutural foi alterado durante os testes.


## Fase 5 — Conclusão do fluxo autenticado

- Data: 2026-07-22 (`America/Sao_Paulo`).
- O segredo foi colocado localmente em `.env.local`, ignorado pelo Git e protegido com permissão `600`; somente as chaves `FINANCAS_PWA_TOKEN` e `FINANCAS_PWA_MAGIC_LINK` permanecem no arquivo.
- O token possui o formato esperado de 64 caracteres hexadecimais. Seu valor não foi exibido, registrado em logs ou incluído na documentação.
- O magic link foi aberto no Chrome e a presença da sessão foi confirmada pela chave `financas_mpd_auth_token`, sem leitura do valor.
- A PWA autenticada em viewport 430 x 932 removeu o aviso de acesso, renderizou 36 contas reais e exibiu o controle de pagamento.
- A leitura autenticada retornou HTTP `200`, 36 contas e resumo de 17 vencidas, 1 vencendo hoje e 18 próximas.
- Três contas de agosto foram isoladas para as ações: pagamento, adiamento para `2026-08-31` e ignorar.
- As três ações retornaram HTTP `200` e persistiram respectivamente os estados `paga`, `adiada` e `ignorada`.
- A repetição do pagamento retornou `updated_count = 0`; adiamento e ignorar devolveram o estado já aplicado sem criar novo efeito.
- A leitura direta de `contas_mensais!A20:N22` confirmou estados, datas e timestamps persistidos, mantendo validações e demais valores.
- `contas_mensais!J20:N22` foi restaurado em uma única atualização de conteúdo: três estados `pendente`, campos operacionais vazios e timestamps originais.
- A leitura autenticada final voltou a retornar as 36 contas e o mesmo resumo `17/1/18`.
- Nenhum workflow, credencial, cabeçalho, formato ou validação foi alterado.


## Fase 5 — Modo público temporário

- Data: 2026-07-22 (`America/Sao_Paulo`).
- O usuário autorizou explicitamente o acesso público temporário para validar o MVP em qualquer dispositivo.
- O frontend recebeu `PUBLIC_MVP_MODE = true`; deixou de bloquear a ausência de sessão e não envia `Authorization` nesse modo.
- O cache do service worker avançou de `contas-mpd-shell-v12` para `contas-mpd-shell-v13`.
- Os quatro workflows da API alteraram somente `Code - Preparar contexto`, mantendo o ramo de autenticação existente, mas definindo a requisição como autorizada.
- Versões publicadas: listar `f1bbd9dd-cf19-416f-83bd-41c0f2c3a0f7`, pagar `b5286c08-02b1-4d88-aba1-f9a051444592`, adiar `9358e139-5b5d-41cc-8a7e-f197cc71930f` e ignorar `27714879-5c9f-4d66-8a43-ba1692167191`.
- O deployment Vercel de produção `dpl_DtUPd7ze32JEU2cAMd5fQQ2fB2YE` ficou `READY` e foi associado a `https://financas-mpd.vercel.app`.
- `.vercelignore` exclui `.env`, `.env.*`, `.git` e `node_modules`; nenhum token foi enviado no deploy.
- GET sem token retornou `200`, 36 contas e resumo `17/1/18`, com CORS restrito à origem do PWA.
- Pagar com lista vazia retornou `422 VALIDATION_ERROR`; adiar e ignorar IDs inexistentes retornaram `404 ACCOUNT_NOT_FOUND`. Os três resultados comprovam passagem pela validação de negócio sem alterar contas.
- A PWA anônima em viewport 430 x 932 removeu o aviso de acesso, renderizou 36 IDs de conta e exibiu o controle de pagamento.
- A Vercel não registrou erros de runtime após o deploy.
- Risco aceito para esta fase: qualquer pessoa com a URL pode ler e alterar as contas; a autenticação deverá ser refatorada antes de ampliar o uso.
