# Modelo de Dados

Este documento é a referência canônica da estrutura Google Sheets do MVP.

## Planilha do MVP

- Nome: `FINANCAS-MPD - DEV`
- URL: https://docs.google.com/spreadsheets/d/1W6YJYbuRcjQZEij2bycv5ReeAvkSvTiuCNSaez-GrXY/edit?usp=sharing
- ID: `1W6YJYbuRcjQZEij2bycv5ReeAvkSvTiuCNSaez-GrXY`
- Fuso: `America/Sao_Paulo`
- Estado: acesso de edição, abas, cabeçalhos, validações e leitura pela credencial Google Sheets do n8n validados. O estado operacional mutável da planilha deve ser registrado por execução em `tests/manual/EXECUTION_LOG.md`, e não neste documento canônico.

Datas civis usam `YYYY-MM-DD`, competências usam `YYYY-MM` e timestamps usam ISO 8601 com offset. Valores monetários são números sem símbolo ou formatação localizada.

## Aba `despesas_config`

Cadastro das despesas recorrentes. `despesa_id` é a chave primária lógica.

| Coluna | Tipo/formato | Obrigatória | Regra |
|---|---|---:|---|
| `despesa_id` | texto | sim | Único, estável e não vazio |
| `nome` | texto | sim | Nome exibido no card |
| `categoria` | enum | sim | `pessoal` ou `profissional` |
| `tipo_pagamento` | enum | sim | `manual` ou `debito_automatico` |
| `moeda_original` | enum ISO 4217 | sim | `ARS` ou `BRL`; a API atual exibe ARS como principal |
| `valor_estimado` | número >= 0 | sim | Valor previsto para geração da ocorrência |
| `dia_vencimento` | inteiro de 1 a 31 | sim | Dia padrão; a geração deve tratar meses mais curtos |
| `ativa` | enum | sim | `sim` ou `não` |

Cabeçalho exato:

```text
despesa_id,nome,categoria,tipo_pagamento,moeda_original,valor_estimado,dia_vencimento,ativa
```

Os registros operacionais não são reproduzidos neste documento porque mudam durante a validação. A massa controlada cadastrada e as alterações posteriores são preservadas em [N8N_EXECUTION_LOG.md](N8N_EXECUTION_LOG.md) e nos logs de testes manuais.

## Aba `contas_mensais`

Ocorrências mensais. `conta_id` é a chave primária lógica e `despesa_id` referencia `despesas_config`. A combinação `despesa_id + competencia` deve ser única.

| Coluna | Tipo/formato | Obrigatória | Regra |
|---|---|---:|---|
| `conta_id` | texto | sim | Único, estável e não vazio |
| `despesa_id` | texto | sim | Deve existir em `despesas_config` |
| `competencia` | `YYYY-MM` | sim | Competência da ocorrência |
| `vencimento` | `YYYY-MM-DD` | sim | Data civil válida |
| `valor_original` | número >= 0 | sim | Valor principal normalizado para ARS |
| `moeda_original` | enum ISO 4217 | sim | `ARS` no modelo normalizado do MVP |
| `valor_convertido` | número >= 0 | sim | Valor secundário em BRL |
| `moeda_convertida` | enum ISO 4217 | sim | `BRL` no modelo normalizado do MVP |
| `cotacao_usada` | número > 0 | sim | ARS equivalentes a `1 BRL` na competência |
| `status` | enum | sim | `pendente`, `paga`, `adiada`, `ignorada` ou `cancelada` |
| `pago_em` | timestamp ou vazio | condicional | Preenchido quando `status = paga` |
| `adiada_para` | `YYYY-MM-DD` ou vazio | condicional | Preenchido quando `status = adiada` |
| `ignorada_em` | timestamp ou vazio | condicional | Preenchido quando `status = ignorada` |
| `atualizado_em` | timestamp | sim | Última alteração persistida |

Para manter a interface com ARS como moeda principal, a ocorrência mensal é normalizada durante a geração:

- despesa configurada em ARS: `valor_original = valor_estimado`, `moeda_original = ARS`, `valor_convertido = round(valor_estimado / cotacao_ars_por_brl, 2)` e `moeda_convertida = BRL`;
- despesa configurada em BRL: `valor_original = round(valor_estimado × cotacao_ars_por_brl, 2)`, `moeda_original = ARS`, `valor_convertido = valor_estimado` e `moeda_convertida = BRL`;
- `cotacao_usada` recebe a cotação mensal aplicada e a ocorrência não é recalculada automaticamente depois de criada.

Cabeçalho exato:

```text
conta_id,despesa_id,competencia,vencimento,valor_original,moeda_original,valor_convertido,moeda_convertida,cotacao_usada,status,pago_em,adiada_para,ignorada_em,atualizado_em
```

Os exemplos fictícios usados durante a construção inicial não representam mais o estado vigente. Seus resultados permanecem no histórico de [N8N_EXECUTION_LOG.md](N8N_EXECUTION_LOG.md). Quantidades, status e timestamps atuais devem ser capturados no início de cada execução manual.

## Aba `notificacoes`

Registro dos envios da Fase 4. `notificacao_id` é a chave primária lógica. Para impedir reenvios, a combinação `conta_id + etapa + canal` deve ser única para um envio bem-sucedido.

| Coluna | Tipo/formato | Obrigatória | Regra |
|---|---|---:|---|
| `notificacao_id` | texto | sim | Único e não vazio |
| `conta_id` | texto | sim | Deve existir em `contas_mensais` |
| `etapa` | enum | sim | `D-5`, `D-2`, `D-1`, `D0` ou `D+1` |
| `enviada_em` | timestamp | sim | Horário da tentativa |
| `canal` | enum | sim | `whatsapp` |
| `status_envio` | enum | sim | `enviada` ou `erro` |

Cabeçalho exato:

```text
notificacao_id,conta_id,etapa,enviada_em,canal,status_envio
```

O conteúdo desta aba é histórico operacional e pode crescer com o workflow diário. A quantidade atual nunca deve ser inferida deste documento: deve ser relida e registrada no baseline de cada teste.

## Aba `cotacoes_mensais`

Fonte manual e auditável da cotação usada pelo workflow de geração mensal. A aba foi criada com `sheetId = 202607210`, cabeçalho congelado e validação nativa para exigir cotação numérica positiva. A credencial Google Sheets do n8n confirmou a visibilidade da nova aba após a criação.

| Coluna | Tipo/formato | Obrigatória | Regra |
|---|---|---:|---|
| `competencia` | `YYYY-MM` | sim | Única e não vazia |
| `cotacao_ars_por_brl` | número > 0 | sim | Quantidade de ARS equivalente a `1 BRL` |
| `atualizado_em` | timestamp ISO 8601 com offset | sim | Momento da inclusão ou correção |
| `atualizado_por` | texto | sim | Responsável; no MVP, `Christian` |

Cabeçalho exato:

```text
competencia,cotacao_ars_por_brl,atualizado_em,atualizado_por
```

O dado fictício inicial de `250 ARS/BRL` pertence somente ao histórico de implementação. A massa controlada de julho e agosto de 2026 foi corrigida para `290 ARS/BRL`; o valor vigente de cada competência deve sempre ser confirmado diretamente na aba antes de testar ou gerar ocorrências.

Regra operacional:

- Christian cadastra uma linha antes da primeira geração de cada competência;
- o workflow exige exatamente uma linha válida para a competência processada;
- cotação ausente, duplicada ou não positiva interrompe a execução sem criar contas;
- correções futuras afetam somente ocorrências ainda não geradas.

Regra operacional da geração mensal:

- o workflow executa diariamente às `06:00` em `America/Sao_Paulo`;
- cada execução calcula a janela inclusiva entre a data local e `D+30`;
- somente ocorrências cujo vencimento ajustado esteja dentro dessa janela são consideradas;
- contas antigas não são removidas quando saem da janela e permanecem como histórico;
- somente linhas com `ativa = sim` são elegíveis;
- a combinação `despesa_id + competencia` é consultada antes da escrita e não pode ser duplicada;
- `conta_id` é determinístico no formato `conta_YYYY_MM_<despesa_id>`;
- quando `dia_vencimento` não existe no mês-alvo, usa-se o último dia válido do mês;
- todas as competências necessárias à janela são validadas antes da escrita;
- cotação ausente, duplicada ou não positiva encerra integralmente a execução antes da escrita.

Com a configuração atual, a cotação de setembro de 2026 deve estar cadastrada até `2026-08-02`, quando `2026-09-01` passa a integrar a janela `D+30`.

Regra operacional dos débitos automáticos:

- o workflow de liquidação executa diariamente às `00:05` em `America/Sao_Paulo`;
- contas `pendente` ou `adiada`, relacionadas a despesas `debito_automatico` e com `vencimento` original anterior à data local, tornam-se `paga`;
- `pago_em` e `atualizado_em` recebem o mesmo timestamp, e `adiada_para` é limpo;
- contas já pagas, ignoradas ou canceladas não são regravadas;
- a repetição sem novos vencidos produz zero atualizações.

## Uso por integração

- `GET /api/accounts` lê `contas_mensais` e cruza `despesas_config` por `despesa_id`.
- Os três endpoints de alteração leem e atualizam somente `contas_mensais`.
- O workflow de geração mensal lê `cotacoes_mensais` e copia a cotação aplicada para `contas_mensais.cotacao_usada`.
- O workflow de liquidação atualiza somente os campos operacionais de débitos automáticos vencidos em `contas_mensais`.
- A Fase 4 lê contas exibíveis e grava os resultados de envio em `notificacoes`.
- O PWA nunca acessa esta planilha diretamente.
