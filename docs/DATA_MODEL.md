# Modelo de Dados

## Aba: despesas_config

Cadastro base das contas recorrentes.

| Campo | Descrição |
|---|---|
| despesa_id | ID estável da despesa |
| nome | Nome da conta |
| categoria | Despesa pessoal ou profissional |
| tipo_pagamento | manual ou debito_automatico |
| moeda_original | ARS ou BRL |
| valor_estimado | Valor previsto |
| dia_vencimento | Dia padrão de vencimento |
| ativa | sim/não |

## Aba: contas_mensais

Ocorrências mensais das contas.

| Campo | Descrição |
|---|---|
| conta_id | ID da ocorrência mensal |
| despesa_id | Referência da despesa |
| competencia | Exemplo: 2026-08 |
| vencimento | Data real de vencimento |
| valor_original | Valor na moeda original |
| moeda_original | ARS ou BRL |
| valor_convertido | Valor convertido |
| moeda_convertida | ARS ou BRL |
| cotacao_usada | Cotação usada |
| status | pendente, paga, adiada, ignorada, cancelada |
| pago_em | Data/hora do pagamento |
| adiada_para | Nova data, se houver |
| ignorada_em | Data/hora, se houver |
| atualizado_em | Última atualização |

## Aba: notificacoes

Controle de mensagens enviadas.

| Campo | Descrição |
|---|---|
| notificacao_id | ID único |
| conta_id | Conta relacionada |
| etapa | D-5, D-2, D-1, D0, D+1 |
| enviada_em | Data/hora |
| canal | whatsapp |
| status_envio | enviada, erro |
