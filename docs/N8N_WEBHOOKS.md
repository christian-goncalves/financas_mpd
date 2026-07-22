# Webhooks n8n — Especificação Operacional

Este documento define como os quatro endpoints de [API_CONTRACT.md](API_CONTRACT.md) devem ser implementados no n8n. Evidências e IDs de execuções ficam em [N8N_EXECUTION_LOG.md](N8N_EXECUTION_LOG.md).

## Estado atual

| Workflow | Método e path | Estado |
|---|---|---|
| `FINANCAS-MPD - API - Listar contas` | `GET api/accounts` | Publicado e validado em `/webhook/api/accounts` |
| `FINANCAS-MPD - API - Pagar contas` | `POST api/accounts/pay` | Publicado e validado em `/webhook/api/accounts/pay` |
| `FINANCAS-MPD - API - Adiar conta` | `POST api/accounts/postpone` | Publicado e validado em `/webhook/api/accounts/postpone` |
| `FINANCAS-MPD - API - Ignorar conta` | `POST api/accounts/ignore` | Publicado e validado em `/webhook/api/accounts/ignore` |

Os quatro endpoints foram publicados em 2026-07-21. As rotas `/webhook/api/*` são internas ao n8n, e o proxy Traefik expõe os quatro paths públicos `/api/*`.

Em 2026-07-21, os quatro endpoints públicos foram exercitados pelo PWA de produção com dados fictícios. Todos retornaram `200`, persistiram a ação esperada e a massa foi restaurada ao final. Em 2026-07-22, os quatro workflows foram republicados em modo público temporário, sem exigir Bearer token.

## Configuração compartilhada

### Variáveis e credenciais

| Item | Uso | Regra |
|---|---|---|
| `FINANCAS_PWA_TOKEN` | Validar o Bearer token | Nunca registrar valor em documentação, export ou resposta |
| `FINANCAS_ALLOWED_ORIGIN` | Restringir CORS | Deve corresponder à origem efetiva do PWA |
| Credencial Google Sheets | Ler e alterar a planilha | Deve permanecer no gerenciador de credenciais do n8n |
| ID da planilha | Identificar a base | Usar o ID registrado em [DATA_MODEL.md](DATA_MODEL.md) |

A credencial Google Sheets e o acesso de leitura à planilha foram confirmados em 2026-07-21, conforme [N8N_EXECUTION_LOG.md](N8N_EXECUTION_LOG.md). A origem autorizada é `https://financas-mpd.vercel.app`, e o token final foi provisionado conforme [ACCESS_TOKEN.md](ACCESS_TOKEN.md). A política de retenção foi aplicada aos quatro workflows da API.

`FINANCAS_ALLOWED_ORIGIN` foi atualizada no EasyPanel, na especificação do Swarm e no container n8n. A origem local `http://127.0.0.1:8000` não faz mais parte da configuração vigente.

### Retenção de execuções

Os quatro workflows devem manter explicitamente:

- `saveDataSuccessExecution: none`;
- `saveDataErrorExecution: none`;
- `saveManualExecutions: false`;
- `saveExecutionProgress: false`.

Essa política impede que payloads e headers de autenticação sejam persistidos nos dados de execução. Ela é local aos quatro workflows da API e não altera a retenção global dos demais projetos da instância.

### Autenticação

Exceção vigente na validação do MVP: o nó de contexto define a requisição como autorizada sem verificar o Bearer token. O ramo `401` e o código anterior foram preservados para reversão.

Quando a autenticação for reativada, todos os endpoints devem:

1. Normalizar os nomes dos headers.
2. Exigir exatamente `Authorization: Bearer <token>`.
3. Validar o token antes de acessar a planilha.
4. Retornar `401 UNAUTHORIZED` com a mesma resposta pública para token ausente, malformado, inválido ou revogado.
5. Não incluir o token nos itens, respostas ou mensagens de erro.

O token em query param não é aceito pela API. O query param fica restrito ao recebimento inicial do magic link pelo PWA e é removido imediatamente da URL visível.

### Respostas e segurança

- Usar os envelopes, códigos HTTP e payloads definidos em [API_CONTRACT.md](API_CONTRACT.md).
- Gerar `request_id` para toda resposta.
- Usar `America/Sao_Paulo` para datas operacionais e timestamps.
- Enviar `Content-Type: application/json` e `Cache-Control: no-store`.
- Enviar `Access-Control-Allow-Origin` somente para a origem autorizada e `Vary: Origin`.
- Não retornar nomes de credenciais, números de linha, `cotacao_usada`, logs ou detalhes internos do n8n.
- Não acessar Evolution API em nenhum dos quatro workflows.

### Estrutura mínima dos workflows

Cada workflow deve manter responsabilidades identificáveis para:

1. Webhook.
2. Preparação do contexto e `request_id`.
3. Autenticação.
4. Validação do payload.
5. Leitura no Google Sheets.
6. Validação de existência e estado.
7. Transformação ou atualização.
8. Resposta de sucesso.
9. Respostas de erro padronizadas.

É permitido consolidar etapas em nós `Code`, desde que autenticação, validação, leitura, escrita e respostas continuem auditáveis.

## GET `/api/accounts`

### Fonte e processamento

1. Ler `contas_mensais`.
2. Manter somente status `pendente` ou `adiada`.
3. Cruzar `despesa_id` com `despesas_config`.
4. Manter somente despesas com `ativa = sim`.
5. Usar `adiada_para` como data efetiva quando preenchida; caso contrário, usar `vencimento`.
6. Calcular `grupo_visual` como `vencida`, `hoje` ou `proxima` no fuso oficial.
7. Montar os campos públicos definidos no contrato.
8. Calcular `summary` a partir da lista final.

Uma lista vazia retorna `200`, `accounts: []` e contadores zerados.

### Testes mínimos

- Token válido, ausente e inválido.
- Três grupos visuais e resumo coerente.
- Despesa inativa não aparece.
- Status `paga`, `ignorada` e `cancelada` não aparecem.
- Registro adiado usa `adiada_para`.
- Nenhum campo interno é devolvido.
- GET repetido não altera a planilha.

## POST `/api/accounts/pay`

### Leitura, validação e escrita

1. Exigir `conta_ids` como array não vazio de strings não vazias.
2. Normalizar IDs duplicados.
3. Ler todas as contas antes de escrever.
4. Retornar `404 ACCOUNT_NOT_FOUND` se algum ID não existir.
5. Considerar `pendente` e `adiada` elegíveis para atualização.
6. Considerar `paga` uma repetição idempotente.
7. Retornar `409 INVALID_STATE` se alguma conta estiver `ignorada`, `cancelada` ou em outro estado incompatível.
8. Não escrever nada quando qualquer item for inválido ou incompatível.
9. Atualizar todas as contas elegíveis em uma única operação batch: `status = paga`, `pago_em = now` e `atualizado_em = now`.
10. Preservar `pago_em` e `atualizado_em` das contas já pagas.

`updated_count` conta apenas linhas efetivamente alteradas. Uma repetição totalmente idempotente retorna `200` e `updated_count: 0`.

### Testes mínimos

- Uma e várias contas elegíveis.
- IDs duplicados.
- Lista vazia e item de tipo inválido.
- ID inexistente sem alteração parcial.
- Estado incompatível sem alteração parcial.
- Mistura de conta já paga com conta elegível.
- Repetição totalmente idempotente sem mudança de timestamps.
- Falha da operação batch sem resposta de sucesso.

## POST `/api/accounts/postpone`

### Leitura, validação e escrita

1. Exigir `conta_id` e `adiada_para`.
2. Validar data civil `YYYY-MM-DD` não anterior à data de processamento.
3. Retornar `404 ACCOUNT_NOT_FOUND` se a conta não existir.
4. Permitir nova alteração somente em `pendente` ou `adiada`.
5. Se já estiver `adiada` para a mesma data, retornar `200` sem regravar timestamps.
6. Retornar `409 INVALID_STATE` para `paga`, `ignorada`, `cancelada` ou outro estado incompatível.
7. Atualizar `status = adiada`, `adiada_para` e `atualizado_em`.

### Testes mínimos

- Data futura válida.
- Data ausente, inválida, inexistente ou anterior.
- ID inexistente.
- Estado incompatível sem alteração.
- Repetição da mesma data sem mudança de timestamp.
- Token válido, ausente e inválido.

## POST `/api/accounts/ignore`

### Leitura, validação e escrita

1. Exigir `conta_id` e rejeitar campos operacionais extras.
2. Retornar `404 ACCOUNT_NOT_FOUND` se a conta não existir.
3. Permitir nova alteração somente em `pendente` ou `adiada`.
4. Se já estiver `ignorada`, retornar `200` sem regravar timestamps.
5. Retornar `409 INVALID_STATE` para `paga`, `cancelada` ou outro estado incompatível.
6. Atualizar `status = ignorada`, `ignorada_em` e `atualizado_em`.

### Testes mínimos

- Conta elegível.
- Body ausente e `conta_id` inválido.
- Campo operacional proibido.
- ID inexistente.
- Estado incompatível sem alteração.
- Repetição sem mudança de `ignorada_em`.
- Token válido, ausente e inválido.

## URLs, publicação e proxy

Durante a integração com Google Sheets, usar somente a URL nativa de teste iniciada pelo editor:

```text
https://<host-n8n>/webhook-test/<path>
```

Após concluir e aprovar os testes persistentes:

1. Publicar os workflows.
2. Validar a URL nativa `/webhook/<path>`.
3. Configurar o proxy para expor o contrato público `/api/*` sem `/webhook`.
4. Responder preflight `OPTIONS` diretamente no proxy com resposta 2xx vazia, sem criar um quinto webhook de negócio. O Traefik 3.6 retorna `200` nesse fluxo.
5. Restringir CORS à origem final do PWA.

Publicação, proxy e CORS final estão concluídos. O recebimento seguro do token e a validação do PWA permanecem nas tarefas seguintes.

## Critério de saída da integração persistente

- Os quatro endpoints leem ou alteram a planilha conforme o contrato.
- Cada endpoint possui testes de sucesso, autenticação, validação, estado e idempotência.
- Pagamento múltiplo não produz sucesso parcial.
- Somente dados fictícios foram usados.
- Nenhum segredo aparece em resposta, export ou documentação.
- Evolution API permaneceu fora da etapa.
- As evidências foram registradas em [N8N_EXECUTION_LOG.md](N8N_EXECUTION_LOG.md).
