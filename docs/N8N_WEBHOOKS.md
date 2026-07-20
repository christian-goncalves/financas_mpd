# Webhooks n8n — especificação operacional da Fase 3B

## Status e escopo

Este documento especifica a montagem manual, no n8n self-hosted, dos quatro webhooks definidos em `docs/API_CONTRACT.md`.

Nesta fase:

- os dados e as alterações são simulados dentro do n8n;
- os workflows não acessam Google Sheets;
- os workflows não acessam Evolution API;
- o PWA não é alterado;
- não existe persistência entre execuções dos webhooks;
- o contrato público da API permanece inalterado.

O objetivo é publicar respostas controladas para validar autenticação, payloads, códigos HTTP, CORS e compatibilidade do PWA antes da conexão com a planilha.

## Visão geral

| Workflow sugerido | Método | Endpoint público | Path no nó Webhook |
|---|---|---|---|
| `FINANCAS-MPD - API - Listar contas mock` | `GET` | `/api/accounts` | `api/accounts` |
| `FINANCAS-MPD - API - Pagar contas mock` | `POST` | `/api/accounts/pay` | `api/accounts/pay` |
| `FINANCAS-MPD - API - Adiar conta mock` | `POST` | `/api/accounts/postpone` | `api/accounts/postpone` |
| `FINANCAS-MPD - API - Ignorar conta mock` | `POST` | `/api/accounts/ignore` | `api/accounts/ignore` |

Cada workflow deve usar um nó **Webhook** configurado com **Respond: Using Respond to Webhook Node**. Cada saída possível deve terminar em um nó **Respond to Webhook**, com corpo JSON, código HTTP e headers definidos explicitamente.

## URLs públicas, URLs do n8n e proxy

Por padrão, o n8n usa:

- `/webhook-test/<path>` para testes iniciados pelo editor;
- `/webhook/<path>` para workflows publicados.

Assim, um nó com path `api/accounts` terá, sem proxy:

```text
https://<host-n8n>/webhook-test/api/accounts
https://<host-n8n>/webhook/api/accounts
```

O contrato público exige `https://<host-publico>/api/accounts`. Para preservar esse contrato, o proxy reverso deve encaminhar:

```text
/api/*  ->  /webhook/api/*
```

O path público não deve incluir `/webhook`. Se o proxy ainda não estiver configurado, os testes manuais podem usar temporariamente as URLs nativas do n8n, mas isso não altera o contrato final.

No self-hosted atrás de proxy, configurar também `WEBHOOK_URL`, `N8N_PROXY_HOPS` e os headers `X-Forwarded-For`, `X-Forwarded-Host` e `X-Forwarded-Proto` conforme a documentação oficial do n8n.

Referências:

- [Webhook URL atrás de proxy](https://docs.n8n.io/hosting/configuration/configuration-examples/webhook-url/)
- [Variáveis dos endpoints do n8n](https://docs.n8n.io/hosting/configuration/environment-variables/endpoints/)
- [Nó Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/)

## Configuração compartilhada

### Valores necessários

Provisionar no ambiente controlado do n8n, sem inserir valores reais nos workflows exportados:

| Configuração | Finalidade | Valor nesta fase |
|---|---|---|
| `FINANCAS_PWA_TOKEN` | Token Bearer aceito pelos quatro webhooks | Token exclusivo de teste, longo e revogável |
| `FINANCAS_ALLOWED_ORIGIN` | Origem autorizada no CORS | Origem local de teste ou domínio do PWA |
| `GENERIC_TIMEZONE` | Fuso usado em datas e timestamps | Definir antes da montagem; recomendação operacional: `America/Sao_Paulo` |

O token não deve aparecer em nós `Set`, `Code`, nomes de execução, respostas, screenshots ou documentação. A referência ao segredo deve vir do mecanismo de configuração do ambiente self-hosted.

Durante a Fase 3B, usar apenas um token de teste sem acesso a dados reais. Antes de usar um token de produção, configurar a política de retenção das execuções para evitar conservar headers de autenticação nos dados de execução.

### Headers de request

Todos os endpoints esperam:

```http
Authorization: Bearer <token-de-acesso>
Accept: application/json
```

Os três endpoints `POST` também exigem:

```http
Content-Type: application/json
```

O token em query param não será aceito pelos webhooks. O query param fica restrito ao futuro recebimento inicial do magic link pelo PWA.

### Validação do Bearer token

Aplicar a mesma sequência nos quatro workflows:

1. Extrair `headers.authorization` sem registrar seu conteúdo em campos auxiliares.
2. Confirmar que o header existe e começa exatamente com `Bearer `.
3. Extrair o token após o prefixo.
4. Comparar com `FINANCAS_PWA_TOKEN` no ambiente controlado.
5. Se o token estiver ausente, malformado ou inválido, encerrar no `Respond - 401`.
6. Nunca devolver o token nem o header recebido.

Resposta comum de autenticação inválida:

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token de acesso inválido ou ausente.",
    "details": []
  },
  "request_id": "req_<execution-id>"
}
```

Código HTTP: `401`.

### Request ID e timestamps

- Gerar um `request_id` em toda execução, por exemplo `req_<execution-id-do-n8n>`.
- O mesmo `request_id` deve aparecer nas respostas de sucesso e erro daquela execução.
- Usar timestamps ISO 8601 com offset, por exemplo `2026-08-14T09:35:00-03:00`.
- Usar datas civis no formato `YYYY-MM-DD`.
- Não devolver IDs de workflow, nomes de credenciais ou detalhes internos de execução.

### Headers de response

Configurar em todos os nós **Respond to Webhook**:

```http
Content-Type: application/json
Cache-Control: no-store
Access-Control-Allow-Origin: <origem-exata-autorizada>
Vary: Origin
```

Não usar `Access-Control-Allow-Origin: *` com dados autenticados. Se o request possuir `Origin`, responder com CORS apenas quando ele coincidir com `FINANCAS_ALLOWED_ORIGIN`.

As respostas a requests `POST` e a configuração do proxy para preflight devem permitir:

```http
Access-Control-Allow-Headers: Authorization, Content-Type, Accept
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

O navegador poderá enviar `OPTIONS` antes de requests com `Authorization` ou JSON. Esse preflight deve ser respondido no proxy reverso com `204`, sem criar um quinto webhook de negócio. Alternativamente, PWA e API podem ser expostos sob a mesma origem.

### Estrutura comum dos nós

Cada workflow deve seguir esta organização:

1. **Webhook** — recebe o método e o path exatos.
2. **Code — Preparar contexto** — cria `request_id`, normaliza headers e body e referencia o segredo sem copiá-lo para a saída.
3. **IF — Token válido?** — separa autenticação válida e inválida.
4. **Respond to Webhook — 401** — retorna o envelope `UNAUTHORIZED`.
5. **Code — Validar request** — aplica as validações específicas do endpoint.
6. **Switch — Resultado da validação** — encaminha sucesso, `400`, `404`, `409` ou `422`.
7. **Code ou Edit Fields — Gerar mock** — monta somente o resultado simulado previsto no contrato.
8. **Respond to Webhook — sucesso/erro** — devolve JSON, status e headers.

É aceitável consolidar preparação, validação e mock em menos nós `Code`, mas autenticação, sucesso e cada erro devem continuar explicitamente distinguíveis no canvas.

## Comportamento dos mocks

Os mocks são stateless:

- cada chamada é uma nova execução independente;
- `POST` confirma a operação, mas não grava estado;
- o `GET` sempre devolve o conjunto mock original;
- o PWA remove ou move cards localmente após um `POST` bem-sucedido;
- recarregar o PWA recupera novamente o conjunto mock do `GET`.

Para testar idempotência sem persistência, chamadas repetidas com o mesmo payload válido devem retornar `200` e o mesmo resultado semântico. `request_id` e timestamp podem mudar entre execuções.

Usar uma lista fechada de IDs mock conhecidos em todos os workflows:

```text
conta_mock_001
conta_mock_002
conta_mock_003
```

Antes de cada rodada de teste, as datas do mock de listagem devem ser geradas ou ajustadas de modo que:

- `conta_mock_001` tenha data efetiva anterior ao dia do teste e `grupo_visual: vencida`;
- `conta_mock_002` tenha data efetiva igual ao dia do teste e `grupo_visual: hoje`;
- `conta_mock_003` tenha data efetiva posterior ao dia do teste e `grupo_visual: proxima`.

## 1. GET `/api/accounts`

### Configuração

- **Workflow:** `FINANCAS-MPD - API - Listar contas mock`
- **Método:** `GET`
- **Path no Webhook:** `api/accounts`
- **Body:** não permitido nem necessário
- **Headers:** `Authorization` e `Accept`

### Nós necessários

1. `Webhook - GET accounts`
2. `Code - Preparar contexto`
3. `IF - Token válido?`
4. `Respond to Webhook - 401`
5. `Code - Gerar contas mock`
6. `Respond to Webhook - 200`
7. `Respond to Webhook - 500`, conectado ao tratamento de erro do workflow se a geração do mock falhar

### Dados mockados

O nó `Code - Gerar contas mock` deve produzir um único item contendo `ok`, `data` e `request_id`. `data.accounts` contém três contas no formato integral do contrato.

Exemplo, substituindo as três datas pelos valores coerentes com o dia do teste:

```json
{
  "ok": true,
  "data": {
    "accounts": [
      {
        "conta_id": "conta_mock_001",
        "nome": "Internet Residencial",
        "categoria": "pessoal",
        "tipo_pagamento": "manual",
        "grupo_visual": "vencida",
        "vencimento": "<data-anterior-em-YYYY-MM-DD>",
        "adiada_para": null,
        "moeda_original": "ARS",
        "valor_original": 42800,
        "moeda_convertida": "BRL",
        "valor_convertido": 168.2,
        "status": "pendente"
      },
      {
        "conta_id": "conta_mock_002",
        "nome": "Licença de Design",
        "categoria": "profissional",
        "tipo_pagamento": "debito_automatico",
        "grupo_visual": "hoje",
        "vencimento": "<data-do-teste-em-YYYY-MM-DD>",
        "adiada_para": null,
        "moeda_original": "ARS",
        "valor_original": 21900,
        "moeda_convertida": "BRL",
        "valor_convertido": 86.1,
        "status": "pendente"
      },
      {
        "conta_id": "conta_mock_003",
        "nome": "Seguro Residencial",
        "categoria": "pessoal",
        "tipo_pagamento": "debito_automatico",
        "grupo_visual": "proxima",
        "vencimento": "<data-posterior-em-YYYY-MM-DD>",
        "adiada_para": null,
        "moeda_original": "ARS",
        "valor_original": 35400,
        "moeda_convertida": "BRL",
        "valor_convertido": 139.1,
        "status": "pendente"
      }
    ],
    "summary": {
      "vencidas": 1,
      "hoje": 1,
      "proximas": 1
    },
    "generated_at": "<timestamp-ISO-8601-com-offset>"
  },
  "request_id": "req_<execution-id>"
}
```

### Respostas de erro

- `401 UNAUTHORIZED`: token ausente ou inválido.
- `500 INTERNAL_ERROR`: falha inesperada ao montar a resposta; usar mensagem pública `Não foi possível listar as contas.` e `details: []`.

Não devolver erro quando a lista estiver vazia. Nesse caso, retornar `200`, `accounts: []` e resumo zerado.

### Idempotência

Chamadas GET repetidas não alteram estado e devolvem o mesmo conjunto de contas mock, exceto `request_id` e `generated_at`.

### Campos futuros da planilha

Na fase Google Sheets, este workflow lerá:

- `contas_mensais`: `conta_id`, `despesa_id`, `competencia`, `vencimento`, `adiada_para`, `moeda_original`, `valor_original`, `moeda_convertida`, `valor_convertido` e `status`;
- `despesas_config`: `despesa_id`, `nome`, `categoria`, `tipo_pagamento` e `ativa`.

O workflow calculará `grupo_visual`, resumo e data efetiva. Não retornará `cotacao_usada`, campos de auditoria ou dados da aba `notificacoes`.

## 2. POST `/api/accounts/pay`

### Configuração

- **Workflow:** `FINANCAS-MPD - API - Pagar contas mock`
- **Método:** `POST`
- **Path no Webhook:** `api/accounts/pay`
- **Headers:** `Authorization`, `Accept` e `Content-Type: application/json`

### Payload esperado

```json
{
  "conta_ids": [
    "conta_mock_001",
    "conta_mock_002"
  ]
}
```

### Validações

1. O body deve ser JSON válido.
2. `conta_ids` deve existir e ser um array não vazio.
3. Cada item deve ser uma string não vazia.
4. IDs duplicados devem ser removidos antes da resposta.
5. Todos os IDs devem pertencer à lista mock conhecida.
6. Validar toda a lista antes de simular a alteração; não aceitar sucesso parcial.
7. Ignorar ou rejeitar campos extras sem jamais confiar em status, valor ou datas enviados pelo frontend.

### Nós necessários

1. `Webhook - POST accounts pay`
2. `Code - Preparar contexto`
3. `IF - Token válido?`
4. `Respond to Webhook - 401`
5. `Code - Validar conta_ids`
6. `Switch - Resultado da validação`
7. `Respond to Webhook - 400 ou 422`
8. `Respond to Webhook - 404`
9. `Code - Simular pagamento`
10. `Respond to Webhook - 200`

### Resposta de sucesso

```json
{
  "ok": true,
  "data": {
    "conta_ids": [
      "conta_mock_001",
      "conta_mock_002"
    ],
    "status": "paga",
    "updated_count": 2,
    "updated_at": "<timestamp-ISO-8601-com-offset>"
  },
  "request_id": "req_<execution-id>"
}
```

### Respostas de erro

- `400 VALIDATION_ERROR`: JSON ausente ou malformado.
- `422 VALIDATION_ERROR`: `conta_ids` ausente, vazio ou com tipo inválido.
- `404 ACCOUNT_NOT_FOUND`: ao menos um ID não pertence ao conjunto mock.
- `409 INVALID_STATE`: reservado para a futura fonte persistente quando uma conta existir, mas não estiver `pendente` ou `adiada`.
- `500 INTERNAL_ERROR`: falha inesperada na simulação.

Todos os erros seguem o envelope de `docs/API_CONTRACT.md`, com `details` contendo somente campo e motivo seguros.

### Idempotência

- A primeira chamada válida retorna `200`.
- A repetição do mesmo conjunto também retorna `200`, sem duplicar registros.
- Duplicatas dentro do mesmo array são normalizadas antes de calcular `updated_count`.
- Como o mock não persiste, a resposta semântica é sempre a confirmação do conjunto normalizado.

### Campos futuros da planilha

Ler de `contas_mensais`: `conta_id`, `status` e os campos necessários para validar o escopo do token.

Atualizar de forma atômica:

- `status` para `paga`;
- `pago_em`;
- `atualizado_em`.

Nenhum nó Google Sheets é adicionado nesta fase.

## 3. POST `/api/accounts/postpone`

### Configuração

- **Workflow:** `FINANCAS-MPD - API - Adiar conta mock`
- **Método:** `POST`
- **Path no Webhook:** `api/accounts/postpone`
- **Headers:** `Authorization`, `Accept` e `Content-Type: application/json`

### Payload esperado

```json
{
  "conta_id": "conta_mock_001",
  "adiada_para": "2026-08-21"
}
```

### Validações

1. O body deve ser JSON válido.
2. `conta_id` deve ser uma string não vazia.
3. `adiada_para` deve corresponder a uma data civil real em `YYYY-MM-DD`.
4. `adiada_para` não pode ser anterior à data de processamento no fuso definido.
5. `conta_id` deve pertencer à lista mock conhecida.
6. Rejeitar campos que tentem substituir `status`, valores, competência ou grupo visual.
7. Na fonte persistente, permitir apenas status `pendente` ou `adiada`.

### Nós necessários

1. `Webhook - POST accounts postpone`
2. `Code - Preparar contexto`
3. `IF - Token válido?`
4. `Respond to Webhook - 401`
5. `Code - Validar conta e data`
6. `Switch - Resultado da validação`
7. `Respond to Webhook - 400 ou 422`
8. `Respond to Webhook - 404`
9. `Respond to Webhook - 409`
10. `Code - Simular adiamento`
11. `Respond to Webhook - 200`

### Resposta de sucesso

```json
{
  "ok": true,
  "data": {
    "conta_id": "conta_mock_001",
    "status": "adiada",
    "adiada_para": "2026-08-21",
    "updated_at": "<timestamp-ISO-8601-com-offset>"
  },
  "request_id": "req_<execution-id>"
}
```

### Respostas de erro

- `400 VALIDATION_ERROR`: JSON ausente ou malformado.
- `422 VALIDATION_ERROR`: ID ausente ou data ausente, inválida ou anterior ao processamento.
- `404 ACCOUNT_NOT_FOUND`: ID não pertence ao conjunto mock.
- `409 INVALID_STATE`: conta existente em estado incompatível na futura fonte persistente.
- `500 INTERNAL_ERROR`: falha inesperada na simulação.

### Idempotência

Repetir o mesmo `conta_id` e a mesma `adiada_para` retorna `200` e o mesmo estado semântico. Nesta fase não há histórico nem escrita. Na fase persistente, atualizar somente quando o valor mudar e nunca criar registros duplicados.

### Campos futuros da planilha

Ler de `contas_mensais`: `conta_id`, `status`, `vencimento`, `adiada_para` e os campos necessários para validar o escopo do token.

Atualizar:

- `status` para `adiada`;
- `adiada_para`;
- `atualizado_em`.

Após a atualização futura, o n8n recalculará `grupo_visual`; esse campo não é aceito do frontend.

## 4. POST `/api/accounts/ignore`

### Configuração

- **Workflow:** `FINANCAS-MPD - API - Ignorar conta mock`
- **Método:** `POST`
- **Path no Webhook:** `api/accounts/ignore`
- **Headers:** `Authorization`, `Accept` e `Content-Type: application/json`

### Payload esperado

```json
{
  "conta_id": "conta_mock_001"
}
```

O frontend não envia `competencia`; ela será resolvida futuramente pelo registro associado ao `conta_id`.

### Validações

1. O body deve ser JSON válido.
2. `conta_id` deve ser uma string não vazia.
3. `conta_id` deve pertencer à lista mock conhecida.
4. Rejeitar campos que tentem substituir `competencia`, `status` ou timestamps.
5. Na fonte persistente, permitir apenas status `pendente` ou `adiada`.

### Nós necessários

1. `Webhook - POST accounts ignore`
2. `Code - Preparar contexto`
3. `IF - Token válido?`
4. `Respond to Webhook - 401`
5. `Code - Validar conta_id`
6. `Switch - Resultado da validação`
7. `Respond to Webhook - 400 ou 422`
8. `Respond to Webhook - 404`
9. `Respond to Webhook - 409`
10. `Code - Simular conta ignorada`
11. `Respond to Webhook - 200`

### Resposta de sucesso

```json
{
  "ok": true,
  "data": {
    "conta_id": "conta_mock_001",
    "status": "ignorada",
    "ignorada_em": "<timestamp-ISO-8601-com-offset>"
  },
  "request_id": "req_<execution-id>"
}
```

### Respostas de erro

- `400 VALIDATION_ERROR`: JSON ausente ou malformado.
- `422 VALIDATION_ERROR`: `conta_id` ausente ou com tipo inválido.
- `404 ACCOUNT_NOT_FOUND`: ID não pertence ao conjunto mock.
- `409 INVALID_STATE`: conta existente em estado incompatível na futura fonte persistente.
- `500 INTERNAL_ERROR`: falha inesperada na simulação.

### Idempotência

Repetir a ação para o mesmo `conta_id` retorna `200` e a mesma confirmação semântica. Na fase persistente, uma conta já ignorada também deve resultar em sucesso idempotente, sem alterar novamente `ignorada_em` nem criar histórico duplicado.

### Campos futuros da planilha

Ler de `contas_mensais`: `conta_id`, `competencia`, `status` e os campos necessários para validar o escopo do token.

Atualizar:

- `status` para `ignorada`;
- `ignorada_em`;
- `atualizado_em`.

Nenhum dado da aba `notificacoes` é lido ou escrito nesta fase.

## Plano manual de montagem

Para cada um dos quatro workflows:

1. Criar workflow com o nome sugerido.
2. Adicionar o nó `Webhook` com método e path definidos neste documento.
3. Selecionar `Using Respond to Webhook Node` como modo de resposta.
4. Montar preparação, autenticação, validação e mock.
5. Configurar todos os nós `Respond to Webhook` com JSON, código HTTP e headers.
6. Executar `Listen for test event` e testar a URL `/webhook-test/...`.
7. Conferir a execução sem expor o token em campos derivados.
8. Publicar o workflow.
9. Testar a URL `/webhook/...`.
10. Validar o path público `/api/...` após configurar o proxy.

Não ativar nós Google Sheets, HTTP Request, Evolution API ou qualquer outro serviço externo.

## Plano manual de testes HTTP

### Preparação

Definir no terminal apenas para a sessão de teste:

```bash
export FINANCAS_API_URL='https://<host-publico>/api'
export FINANCAS_API_TOKEN='<token-de-teste>'
```

Não salvar o token em arquivo versionado nem incluí-lo em screenshots.

### 1. Listar contas

```bash
curl -i "$FINANCAS_API_URL/accounts" \
  -H "Authorization: Bearer $FINANCAS_API_TOKEN" \
  -H "Accept: application/json"
```

Verificar:

- HTTP `200`;
- `ok: true`;
- três contas no formato do contrato;
- resumo `1/1/1`;
- `Cache-Control: no-store`;
- ausência de token e campos internos na resposta.

### 2. Marcar contas como pagas

```bash
curl -i -X POST "$FINANCAS_API_URL/accounts/pay" \
  -H "Authorization: Bearer $FINANCAS_API_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  --data '{"conta_ids":["conta_mock_001","conta_mock_002"]}'
```

Verificar HTTP `200`, status `paga`, `updated_count: 2` e os dois IDs. Repetir a chamada e confirmar novo `200`, sem mudança semântica.

Testar também `conta_ids: []`, tipo inválido e ID desconhecido.

### 3. Adiar conta

```bash
curl -i -X POST "$FINANCAS_API_URL/accounts/postpone" \
  -H "Authorization: Bearer $FINANCAS_API_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  --data '{"conta_id":"conta_mock_001","adiada_para":"<data-futura-em-YYYY-MM-DD>"}'
```

Verificar HTTP `200`, status `adiada` e a mesma data enviada. Repetir a chamada e confirmar idempotência.

Testar data inexistente, formato diferente de `YYYY-MM-DD`, data anterior ao processamento e ID desconhecido.

### 4. Ignorar conta

```bash
curl -i -X POST "$FINANCAS_API_URL/accounts/ignore" \
  -H "Authorization: Bearer $FINANCAS_API_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  --data '{"conta_id":"conta_mock_001"}'
```

Verificar HTTP `200`, status `ignorada` e `ignorada_em`. Repetir a chamada e confirmar idempotência.

Testar body vazio, tipo inválido e ID desconhecido.

### 5. Token ausente

```bash
curl -i "$FINANCAS_API_URL/accounts" \
  -H "Accept: application/json"
```

Resultado esperado: HTTP `401`, `ok: false`, `error.code: UNAUTHORIZED` e nenhum detalhe interno.

### 6. Token inválido

```bash
curl -i "$FINANCAS_API_URL/accounts" \
  -H "Authorization: Bearer token-invalido" \
  -H "Accept: application/json"
```

Resultado esperado: o mesmo envelope e o mesmo código HTTP do token ausente. A resposta não deve indicar se o token existiu anteriormente.

### 7. Headers e CORS

Para um request autenticado, confirmar:

- `Content-Type: application/json`;
- `Cache-Control: no-store`;
- `Access-Control-Allow-Origin` igual à origem autorizada;
- `Vary: Origin`;
- ausência de headers ou cookies com segredos.

Para testar preflight no proxy:

```bash
curl -i -X OPTIONS "$FINANCAS_API_URL/accounts/pay" \
  -H "Origin: <origem-autorizada>" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type"
```

Resultado esperado: HTTP `204` no proxy e headers CORS limitados à origem autorizada.

## Critérios de saída da Fase 3B

A preparação estará validada quando:

- os quatro workflows mock estiverem montados e publicados manualmente;
- os quatro endpoints responderem conforme `docs/API_CONTRACT.md`;
- token ausente e inválido retornarem `401` padronizado;
- payloads inválidos retornarem o código e envelope previstos;
- chamadas repetidas demonstrarem o comportamento idempotente definido;
- o PWA em modo API conseguir listar e executar as três alterações contra os mocks;
- não houver acesso ao Google Sheets;
- não houver acesso à Evolution API;
- nenhum segredo estiver no frontend ou nos exports dos workflows.

## Pendências antes da conexão real

Ainda precisam ser confirmados antes da próxima fase:

- URL pública final e regra de proxy para preservar `/api/*`;
- origem final do PWA para CORS;
- token de acesso e processo de rotação/revogação;
- fuso oficial do projeto;
- política de retenção dos dados de execução no n8n;
- atomicidade da atualização múltipla sobre Google Sheets;
- regra operacional da cotação ARS/BRL e normalização de despesas originalmente em BRL.

Essas pendências não impedem montar e testar os mocks com valores controlados, mas impedem substituir os mocks pela integração real.
