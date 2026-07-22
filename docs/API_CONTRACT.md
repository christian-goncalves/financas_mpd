# Contrato da API — PWA e n8n

## Status

Documento de desenho da Fase 3A. O contrato permanece como referência para a implementação.

Os quatro endpoints foram conectados ao Google Sheets, publicados e validados pelo PWA de produção. O proxy expõe os caminhos públicos contratuais em `/api/*`, mantém `/webhook/api/*` como implementação interna e restringe CORS à origem `https://financas-mpd.vercel.app`. Desde 2026-07-22, a validação do MVP opera temporariamente sem autenticação; o desenho de Bearer token abaixo fica preservado para futura reativação.

Este contrato define a interface pública entre o PWA Finanças MPD e endpoints controlados pelo n8n. O PWA não acessa Google Sheets nem Evolution API diretamente.

## Princípios

- O PWA conversa somente com endpoints HTTPS controlados pelo n8n.
- O n8n concentra autenticação, validação, regras de negócio e acesso aos serviços internos.
- Google Sheets e Evolution API nunca são chamados diretamente pelo frontend.
- Todas as alterações usam `POST` e corpo JSON.
- Nenhum segredo do n8n, Google Sheets ou Evolution API pode ser incluído no código, nos assets ou nas respostas do PWA.
- Datas civis usam `YYYY-MM-DD`; datas e horas técnicas usam ISO 8601 com fuso horário.
- Valores monetários são números JSON, sem símbolo de moeda e sem formatação localizada.

## Base URL e versão

Base URL pública vigente:

```text
https://n8n.autamacao.shop/api
```

Os caminhos deste documento formam a versão inicial do contrato. Se houver mudança incompatível depois da implementação, deve ser criado um novo prefixo versionado, por exemplo `/api/v2`.

## Autenticação e segurança

### Exceção pública temporária

Durante a validação do MVP, o header `Authorization` é opcional e não é verificado. Os endpoints continuam restritos à origem do PWA por CORS, mas requisições fora de navegador ainda podem alcançar as rotas públicas. Portanto, a URL não deve ser tratada como controle de acesso.

Para evidências da Fase 5, cada execução deve registrar explicitamente `modo_acesso = publico_temporario`. Todas as ocorrências posteriores neste documento que chamam `Authorization` de obrigatório descrevem o contrato preservado para a futura reativação, não o requisito operacional vigente.

O desenho abaixo permanece como referência para a refatoração posterior.

### Recomendação para o token

Enviar o token longo recebido pelo magic link no header:

```http
Authorization: Bearer <token-de-acesso>
```

O header é recomendado porque evita expor o token em histórico, logs de URL, analytics e cabeçalhos `Referer`. O query param `?token=...` deve ficar restrito ao recebimento inicial do magic link e não deve ser usado nas chamadas da API.

O token de acesso:

- não deve ser escrito diretamente em `app.js` ou outro arquivo estático;
- não é um segredo interno do n8n e deve ter escopo apenas para este PWA;
- deve poder ser revogado ou substituído;
- deve ser removido da URL visível após a leitura do magic link;
- nunca deve ser devolvido nas respostas ou gravado em logs de aplicação.

O PWA consome `?token=...` antes de carregar os demais assets, remove o parâmetro com `history.replaceState` e mantém o valor somente em `sessionStorage`. Links malformados são descartados e removem qualquer token anterior da mesma sessão. O modo `api` lê esse valor em tempo de execução e nunca inclui um token nos assets estáticos.

O formato, a fonte segura e os procedimentos de rotação e revogação estão definidos em [ACCESS_TOKEN.md](ACCESS_TOKEN.md). O valor nunca é registrado na documentação.

### Controles mínimos no n8n

- Exigir HTTPS.
- Validar o token antes de consultar ou alterar dados.
- Permitir CORS somente para a origem final do PWA.
- Aceitar `Content-Type: application/json` nos endpoints `POST`.
- Limitar métodos HTTP aos definidos neste contrato.
- Não retornar credenciais, nomes de credenciais, chaves internas ou detalhes de execução.
- Sanitizar logs e mensagens de erro.
- Retornar `Cache-Control: no-store` para dados financeiros e respostas autenticadas.

## Formato padrão das respostas

### Sucesso

```json
{
  "ok": true,
  "data": {},
  "request_id": "req_01JXYZ123"
}
```

### Erro

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A requisição contém dados inválidos.",
    "details": [
      {
        "field": "conta_id",
        "reason": "Campo obrigatório."
      }
    ]
  },
  "request_id": "req_01JXYZ123"
}
```

### Status HTTP

| Status | Uso |
|---|---|
| `200` | Consulta ou alteração concluída; inclui repetição idempotente |
| `400` | JSON inválido ou requisição malformada |
| `401` | Token ausente, inválido ou revogado |
| `404` | `conta_id` não encontrado |
| `409` | Estado atual da conta impede a alteração |
| `422` | Campos presentes, mas inválidos |
| `500` | Falha interna não detalhada ao frontend |

## Formato padrão de uma conta

```json
{
  "conta_id": "conta_2026_08_001",
  "nome": "Internet Residencial",
  "categoria": "pessoal",
  "tipo_pagamento": "manual",
  "grupo_visual": "vencida",
  "vencimento": "2026-08-10",
  "adiada_para": null,
  "moeda_original": "ARS",
  "valor_original": 42800,
  "moeda_convertida": "BRL",
  "valor_convertido": 168.2,
  "status": "pendente"
}
```

### Campos

| Campo | Tipo | Obrigatório | Valores e regras |
|---|---|---|---|
| `conta_id` | string | sim | Identificador estável da ocorrência mensal |
| `nome` | string | sim | Texto não vazio exibido como título do card |
| `categoria` | string | sim | `pessoal` ou `profissional` |
| `tipo_pagamento` | string | sim | `manual` ou `debito_automatico` |
| `grupo_visual` | string | sim | `vencida`, `hoje` ou `proxima` |
| `vencimento` | string | sim | Data civil no formato `YYYY-MM-DD` |
| `adiada_para` | string ou null | não | Nova data operacional `YYYY-MM-DD` quando o status for `adiada` |
| `moeda_original` | string | sim | Código ISO 4217; no MVP, `ARS` |
| `valor_original` | number | sim | Número maior ou igual a zero |
| `moeda_convertida` | string | sim | Código ISO 4217; no MVP, `BRL` |
| `valor_convertido` | number | sim | Número maior ou igual a zero |
| `status` | string | sim | `pendente` ou `adiada` na listagem |

### Compatibilidade com a UI atual

- `grupo_visual: vencida` alimenta a seção **Vencidas**.
- `grupo_visual: hoje` alimenta a seção **Vencem hoje**.
- `grupo_visual: proxima` alimenta a seção **Próximas**.
- `categoria` é apresentada como Pessoal ou Profissional.
- `tipo_pagamento` é apresentado como Manual ou Débito aut.
- A data efetiva exibida é `adiada_para` quando preenchida; caso contrário, `vencimento`.
- `valor_original` em ARS é o valor principal.
- `valor_convertido` em BRL é o valor secundário menor.
- Contas com status `paga`, `ignorada` ou `cancelada` não devem ser devolvidas por este endpoint.

O n8n é responsável por calcular `grupo_visual` usando `adiada_para` quando preenchida e, nos demais casos, `vencimento`, sempre de forma consistente com a data local definida para o projeto. O PWA não deve inferir estados diferentes dos informados pela API.

## 1. Listar contas pendentes

### Método e URL

```http
GET /api/accounts
```

### Objetivo

Retornar as contas pendentes ou adiadas que devem aparecer no PWA, já classificadas segundo o baseline visual.

### Request

O endpoint não recebe body.

Headers obrigatórios:

```http
Authorization: Bearer <token-de-acesso>
Accept: application/json
```

### Response de sucesso

```json
{
  "ok": true,
  "data": {
    "accounts": [
      {
        "conta_id": "conta_2026_08_001",
        "nome": "Internet Residencial",
        "categoria": "pessoal",
        "tipo_pagamento": "manual",
        "grupo_visual": "vencida",
        "vencimento": "2026-08-10",
        "adiada_para": null,
        "moeda_original": "ARS",
        "valor_original": 42800,
        "moeda_convertida": "BRL",
        "valor_convertido": 168.2,
        "status": "pendente"
      }
    ],
    "summary": {
      "vencidas": 1,
      "hoje": 0,
      "proximas": 0
    },
    "generated_at": "2026-08-14T09:30:00-03:00"
  },
  "request_id": "req_01JXYZ123"
}
```

Uma lista sem contas é sucesso e retorna `accounts: []` e todos os contadores iguais a zero.

### Response de erro

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token de acesso inválido ou ausente.",
    "details": []
  },
  "request_id": "req_01JXYZ123"
}
```

### Validações mínimas

- Validar o token antes de ler dados.
- Retornar apenas contas com status `pendente` ou `adiada`.
- Garantir que todos os campos obrigatórios da conta estejam presentes.
- Garantir que `grupo_visual` seja compatível com a data efetiva (`adiada_para` ou `vencimento`) e a data local do projeto.
- Garantir que o resumo corresponda à quantidade real de itens em cada grupo.

### Campos obrigatórios

- Header `Authorization`.
- Na resposta, `accounts`, `summary` e `generated_at`.
- Em cada item, todos os campos definidos no formato padrão da conta.

### Segurança

- Não aceitar filtros que permitam consultar dados fora da lista autorizada pelo token.
- Não retornar campos internos da planilha, cotação técnica, IDs de credenciais ou histórico de notificações.
- Não armazenar a resposta em cache compartilhado.

## 2. Marcar contas como pagas

### Método e URL

```http
POST /api/accounts/pay
```

### Objetivo

Receber uma seleção de contas e alterar o status de todas para `paga`.

### Request

```json
{
  "conta_ids": [
    "conta_2026_08_001",
    "conta_2026_08_002"
  ]
}
```

### Response de sucesso

```json
{
  "ok": true,
  "data": {
    "conta_ids": [
      "conta_2026_08_001",
      "conta_2026_08_002"
    ],
    "status": "paga",
    "updated_count": 2,
    "updated_at": "2026-08-14T09:35:00-03:00"
  },
  "request_id": "req_01JXYZ124"
}
```

`updated_count` representa somente as linhas cujo estado foi efetivamente alterado nesta requisição. Se todos os IDs já estiverem pagos, a resposta continua sendo `200`, preserva os timestamps existentes e retorna `updated_count: 0`.

### Response de erro

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Informe ao menos uma conta.",
    "details": [
      {
        "field": "conta_ids",
        "reason": "A lista não pode estar vazia."
      }
    ]
  },
  "request_id": "req_01JXYZ124"
}
```

### Validações mínimas

- Validar o token antes de alterar dados.
- Exigir array não vazio de strings não vazias.
- Remover ou rejeitar IDs duplicados antes da alteração.
- Confirmar que todas as contas existem e pertencem ao escopo do token.
- Aceitar contas `pendente` ou `adiada` para uma nova alteração.
- Aceitar contas já `paga` como repetição idempotente, sem regravar `pago_em` ou `atualizado_em`.
- Rejeitar `ignorada`, `cancelada` ou qualquer outro estado incompatível com `409 INVALID_STATE`.
- Validar todo o conjunto antes de escrever e executar as alterações elegíveis em uma única operação batch; se um item for inválido, não alterar os demais.
- Registrar `pago_em` e `atualizado_em` no lado controlado pelo n8n.
- Calcular `updated_count` somente com as linhas efetivamente alteradas.

### Campos obrigatórios

- Header `Authorization`.
- Header `Content-Type: application/json`.
- Body `conta_ids`.

### Segurança

- Não confiar em status, datas ou valores enviados pelo frontend.
- Não permitir que um token altere contas fora de seu escopo.
- Não incluir detalhes internos da operação na resposta de erro.

## 3. Adiar conta

### Método e URL

```http
POST /api/accounts/postpone
```

### Objetivo

Adiar uma conta para uma nova data operacional.

### Request

```json
{
  "conta_id": "conta_2026_08_001",
  "adiada_para": "2026-08-21"
}
```

### Response de sucesso

```json
{
  "ok": true,
  "data": {
    "conta_id": "conta_2026_08_001",
    "status": "adiada",
    "adiada_para": "2026-08-21",
    "updated_at": "2026-08-14T09:40:00-03:00"
  },
  "request_id": "req_01JXYZ125"
}
```

### Response de erro

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_STATE",
    "message": "A conta não pode ser adiada no estado atual.",
    "details": [
      {
        "field": "conta_id",
        "reason": "Conta já está paga."
      }
    ]
  },
  "request_id": "req_01JXYZ125"
}
```

### Validações mínimas

- Validar o token antes de alterar dados.
- Exigir `conta_id` como string não vazia.
- Exigir `adiada_para` como data válida `YYYY-MM-DD` e não anterior à data de processamento.
- Confirmar que a conta existe e pertence ao escopo do token.
- Permitir adiamento somente para status `pendente` ou `adiada`.
- Se já estiver `adiada` para a mesma data, retornar `200` sem regravar `atualizado_em`.
- Se estiver `paga`, `ignorada`, `cancelada` ou em outro estado incompatível, retornar `409 INVALID_STATE` sem alteração.
- Registrar `adiada_para` e `atualizado_em` no lado controlado pelo n8n.

### Campos obrigatórios

- Header `Authorization`.
- Header `Content-Type: application/json`.
- Body `conta_id`.
- Body `adiada_para`.

### Segurança

- A nova data é o único dado operacional aceito do frontend além do ID.
- O n8n deve recalcular o estado e `grupo_visual`; o frontend não os envia.
- Não aceitar campos extras como status, valores ou competência para substituir os dados existentes.

## 4. Ignorar conta

### Método e URL

```http
POST /api/accounts/ignore
```

### Objetivo

Ignorar uma ocorrência mensal da conta na competência à qual seu `conta_id` pertence.

### Request

```json
{
  "conta_id": "conta_2026_08_001"
}
```

Não é necessário enviar `competencia`: o `conta_id` identifica a ocorrência mensal e o n8n resolve sua competência.

### Response de sucesso

```json
{
  "ok": true,
  "data": {
    "conta_id": "conta_2026_08_001",
    "status": "ignorada",
    "ignorada_em": "2026-08-14T09:45:00-03:00"
  },
  "request_id": "req_01JXYZ126"
}
```

### Response de erro

```json
{
  "ok": false,
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Conta não encontrada.",
    "details": []
  },
  "request_id": "req_01JXYZ126"
}
```

### Validações mínimas

- Validar o token antes de alterar dados.
- Exigir `conta_id` como string não vazia.
- Confirmar que a conta existe e pertence ao escopo do token.
- Permitir a alteração somente para status `pendente` ou `adiada`.
- Se já estiver `ignorada`, retornar `200` sem regravar `ignorada_em` ou `atualizado_em`.
- Se estiver `paga`, `cancelada` ou em outro estado incompatível, retornar `409 INVALID_STATE` sem alteração.
- Registrar `ignorada_em` e `atualizado_em` no lado controlado pelo n8n.

### Campos obrigatórios

- Header `Authorization`.
- Header `Content-Type: application/json`.
- Body `conta_id`.

### Segurança

- O frontend não envia competência, status ou timestamps.
- O n8n resolve e valida a competência usando o registro associado ao `conta_id`.
- Não permitir alteração fora do escopo definido pelo token.

## Regras para a implementação futura no PWA

- Manter a UI atual enquanto os dados fictícios forem substituídos pela resposta de `GET /api/accounts`.
- Implementar um único adaptador entre os nomes do contrato e o estado visual da aplicação.
- Não espalhar URLs ou lógica de autenticação pelos componentes de renderização.
- Desabilitar a ação enquanto a requisição correspondente estiver em andamento.
- Só remover ou mover cards após confirmação de sucesso da API.
- Em erro, preservar o estado anterior e apresentar mensagem simples ao usuário.
- Não enviar objetos completos de conta nos endpoints de alteração; enviar apenas os campos definidos em cada contrato.

## Dependências operacionais

As decisões ainda necessárias para implementar ou publicar este contrato são mantidas exclusivamente em [QUESTIONS.md](QUESTIONS.md). A ordem executável está em [MVP.md](../tasks/MVP.md).
