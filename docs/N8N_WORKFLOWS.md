# Workflows n8n

Este documento apresenta o inventário funcional dos workflows do MVP. O contrato HTTP dos quatro workflows da API está em [API_CONTRACT.md](API_CONTRACT.md), a montagem operacional em [N8N_WEBHOOKS.md](N8N_WEBHOOKS.md) e as evidências de execução em [N8N_EXECUTION_LOG.md](N8N_EXECUTION_LOG.md).

## Estado atual

- Os quatro endpoints usam Google Sheets e foram validados em modo de teste.
- Persistência, estados incompatíveis e idempotência possuem evidências registradas.
- Os quatro workflows da API estão publicados e nenhum acessa Evolution API.
- A planilha do MVP contém a massa controlada real: 18 despesas e 36 contas mensais entre julho e agosto de 2026.
- A credencial Google Sheets e o acesso de leitura à planilha foram confirmados no n8n em 2026-07-21.
- A regra de cotação manual mensal foi definida e a aba `cotacoes_mensais` foi criada, validada com dado fictício e localizada pela credencial Google Sheets do n8n.
- O workflow diário de geração contínua foi validado, publicado e ativado às `06:00`.
- O workflow diário de liquidação de débitos automáticos foi criado, validado, publicado e ativado às `00:05`.
- O PWA foi publicado em `https://financas-mpd.vercel.app`.
- O token final e seu processo de rotação/revogação estão registrados em [ACCESS_TOKEN.md](ACCESS_TOKEN.md).
- Os quatro workflows da API não retêm dados de execução, erros, testes manuais ou progresso por nó.
- As rotas nativas `/webhook/api/*` foram validadas sem alteração da planilha.
- Os quatro paths públicos `/api/*` e o preflight foram validados no proxy Traefik.
- O CORS está restrito à origem final `https://financas-mpd.vercel.app`.
- O recebimento seguro do token por magic link foi implementado e validado no PWA.
- O PWA foi configurado em modo `api` com a base pública, sem token embutido nos assets.
- Listagem, pagamento, adiamento e ignorar foram validados pelo PWA de produção; a massa fictícia foi restaurada ao final.
- A Fase 3 foi concluída.
- A credencial `Evolution account`, a instância `8611` e o grupo `FINANÇAS | MPD` (`120363429681130867@g.us`) foram validados sem exposição de segredo.
- Um envio simples e controlado foi aceito pela Evolution API com HTTP `201`.
- O workflow diário de lembretes consolidados foi criado, validado e publicado, incluindo registro de sucesso e erro, deduplicação e falha controlada.
- As etapas foram especializadas por tipo: manual usa `D-5`, `D-2`, `D-1`, `D0`, `D+1`; débito automático usa `D-2`, `D-1`, `D0`.
- O registro de resultados `enviada` ou `erro` na aba `notificacoes` foi implementado sem executar o workflow.
- A prevenção de reenvio por `conta_id + etapa + canal` foi implementada e validada sem executar o workflow.
- A geração mensal criou 18 contas de agosto e a repetição não criou duplicidades.
- O workflow diário enviou três lembretes reais elegíveis, registrou os resultados em `notificacoes` e não os reenviou na repetição.
- O modo público temporário foi publicado nos quatro endpoints; a PWA sem token renderizou 36 contas e as rotas de ação alcançaram suas validações de negócio.

## Workflows da API

### Listar contas

- Método e endpoint: `GET /api/accounts`.
- Estado atual: leitura de `contas_mensais` e `despesas_config` validada em modo de teste, com filtros, `grupo_visual` e resumo coerentes.
- Publicado na rota nativa `GET /webhook/api/accounts` e exposto pelo proxy em `GET /api/accounts`.

### Marcar contas como pagas

- Método e endpoint: `POST /api/accounts/pay`.
- Estado atual: leitura, validação integral e atualização batch no Google Sheets validadas em modo de teste.
- Idempotência, estados incompatíveis e ausência de sucesso parcial possuem evidência registrada.
- Publicado na rota nativa `POST /webhook/api/accounts/pay` e exposto pelo proxy em `POST /api/accounts/pay`.

### Adiar conta

- Método e endpoint: `POST /api/accounts/postpone`.
- Estado atual: leitura, validação e atualização de `status`, `adiada_para` e `atualizado_em` no Google Sheets validadas em modo de teste.
- Data civil, estados incompatíveis e repetição idempotente possuem evidência registrada.
- Publicado na rota nativa `POST /webhook/api/accounts/postpone` e exposto pelo proxy em `POST /api/accounts/postpone`.

### Ignorar conta

- Método e endpoint: `POST /api/accounts/ignore`.
- Estado atual: leitura, validação e atualização de `status`, `ignorada_em` e `atualizado_em` no Google Sheets validadas em modo de teste.
- Payload estrito, estados incompatíveis e repetição idempotente possuem evidência registrada.
- Publicado na rota nativa `POST /webhook/api/accounts/ignore` e exposto pelo proxy em `POST /api/accounts/ignore`.

Os quatro workflows da API foram conectados e testados contra a mesma base fictícia, com restauração da massa após os testes.

## Gerar contas mensais

Workflow implementado, validado e publicado.

- Nome: `FINANCAS-MPD - Gerar contas mensais`.
- ID: `YZ70BdQtS7LPE72r`.
- Estado: publicado e ativo.
- Agenda configurada: diariamente às `06:00`, no fuso `America/Sao_Paulo`.
- Janela-alvo: inclusiva entre a data local da execução e `D+30`.
- Vencimentos de dias inexistentes no mês são limitados ao último dia válido.

Regra de cotação definida:

- ler uma cotação manual por competência necessária à janela em `cotacoes_mensais`;
- interpretar a cotação como ARS equivalentes a `1 BRL`;
- validar todas as competências antes da escrita e abortar integralmente quando qualquer cotação estiver ausente, duplicada ou inválida;
- normalizar todas as ocorrências para ARS como principal e BRL como convertido;
- copiar a taxa aplicada para `cotacao_usada` e não recalcular contas já geradas.

Função:

- Executar diariamente.
- Ler despesas ativas em `despesas_config`.
- Criar em `contas_mensais` somente as ocorrências ausentes cujo vencimento esteja entre hoje e `D+30`.
- Preservar contas antigas como histórico.
- Evitar duplicidade pela combinação `despesa_id + competencia`.
- Aplicar a regra de cotação manual mensal definida para o MVP.

Validação operacional mais recente, realizada em 2026-07-23:

- as execuções `6973` e `6975` calcularam `2026-07-23`–`2026-08-22`, encontraram as 18 ocorrências de agosto já existentes e gravaram zero linhas;
- a execução isolada `6977` falhou com `RATE_NOT_FOUND_2026-08`, sem escrita;
- a execução isolada `6980` validou virada de mês e ajuste de dia 31 para o último dia de fevereiro;
- versão publicada: `3223abbe-f9dd-4d45-a311-ed9f9c4a8632`.

## Liquidar débitos automáticos

Workflow criado e publicado em 2026-07-23:

- Nome: `FINANCAS-MPD - Liquidar débitos automáticos`.
- ID: `uwtIrs8q6lCm6ZDZ`.
- Estado: publicado e ativo.
- Horário: diariamente às `00:05`, em `America/Sao_Paulo`.
- Versão publicada: `fc3e8c7e-a5dc-450c-b4e5-98cba9edf817`.

Função:

- relacionar `contas_mensais` com `despesas_config`;
- selecionar somente `pendente` ou `adiada` de tipo `debito_automatico` com `vencimento` original anterior ao dia;
- escrever `status = paga`, o mesmo timestamp em `pago_em` e `atualizado_em`, e limpar `adiada_para`;
- ignorar estados finais e não regravar uma conta já paga.

Validação:

- execução `6974`: 12 contas automáticas examinadas, 6 vencidas de julho atualizadas;
- as seis linhas receberam o mesmo timestamp `2026-07-23T16:34:46.708-03:00`;
- execução repetida `6976`: zero contas elegíveis e zero atualizações;
- o endpoint público passou a retornar 30 contas exibíveis, com resumo `12 vencidas / 0 hoje / 18 próximas`.

## Enviar lembretes

Workflow criado em 2026-07-21:

- Nome: `FINANCAS-MPD - Lembretes consolidados diários`.
- ID: `yQgTRvFBZvvsYKXs`.
- Estado: publicado e ativo.
- Horário: diariamente às `08:00`, em `America/Sao_Paulo`.
- Instância Evolution API: `8611`.
- Grupo autorizado: `120363429681130867@g.us` (`FINANÇAS | MPD`).
- Retenção: dados de sucesso, erro, execução manual e progresso por nó desabilitados.

Função:

- Executar diariamente.
- Ler contas pendentes ou adiadas.
- Identificar as etapas de lembrete pelo vencimento original.
- Gerar uma mensagem consolidada.
- Enviar para o grupo autorizado via Evolution API.
- Registrar uma linha por conta e etapa em `notificacoes`, com `status_envio = enviada` ou `erro`.
- Evitar o reenvio quando já existir `status_envio = enviada` para a mesma conta, etapa e canal.

Formato da mensagem:

- cabeçalho com `Finanças MPD` e data base em `DD/MM/AAAA`;
- uma linha por conta: ``*nome* - _situação_ - `ARS valor` ``;
- nome em negrito, situação em itálico e valor ARS inteiro em monoespaçado;
- valor convertido em BRL omitido para reduzir o volume;
- URL `https://financas-mpd.vercel.app/` ao final, habilitando acesso ao PWA e o preview Open Graph.

O fluxo possui dez nós: Schedule, leitura de `despesas_config`, leitura de `contas_mensais`, leitura de `notificacoes`, preparação do consolidado, verificação de lembretes, envio pela Evolution API, preparação dos registros de sucesso e erro e append em `notificacoes`. A estrutura, as credenciais, a deduplicação e o tratamento de falha foram validados. A versão testada está publicada e ativa com execução diária às `08:00` em `America/Sao_Paulo`.

Validação das etapas atualizada em 2026-07-23:

- contas manuais usam `D-5`, `D-2`, `D-1`, `D0` e `D+1`;
- débitos automáticos usam somente `D-2`, `D-1` e `D0`;
- contas adiadas e pendentes usam sempre o `vencimento` original para calcular a etapa;
- contas pagas, ignoradas e canceladas, além de despesas inativas, foram excluídas;
- datas civis impossíveis foram rejeitadas;
- teste isolado `6978` executou a lógica e bypassou Evolution/Sheets por pin data, sem envio ou escrita real;
- versão publicada: `094d5c02-052d-4fa1-87ed-b544f0acdfd5`.

## Ambiente de simulação encerrado

- O workflow `FINANCAS-MPD - SIM - Lembretes WhatsApp` (`YQ2BC4HT02Vwjuuc`) foi arquivado em 2026-07-23.
- As abas `Cópia de contas_mensais` (`643572288`) e `notificacoes_teste` (`202607222`) foram excluídas após snapshot.
- Nenhum workflow ativo referencia esses dois `sheetId`.
- O histórico da simulação permanece apenas em `tests/manual/EXECUTION_LOG.md`.

Registro implementado em 2026-07-21:

- o sucesso do nó Evolution produz `status_envio = enviada`;
- o erro do nó Evolution usa saída de erro separada e produz `status_envio = erro`;
- cada lembrete da mensagem consolidada gera uma linha com `notificacao_id`, `conta_id`, `etapa`, `enviada_em`, `canal` e `status_envio`;
- `notificacao_id` combina execução, sequência, conta e etapa para permanecer único entre tentativas;
- as duas ramificações convergem em um único append na aba `notificacoes`;
- nenhum dado de `contas_mensais` é atualizado pelo registro;
- o workflow permaneceu inativo e nenhuma linha foi efetivamente gravada nesta etapa.

Deduplicação implementada em 2026-07-21:

- a aba `notificacoes` é lida antes da preparação do consolidado;
- a chave funcional é `conta_id + etapa + canal`;
- somente histórico com `status_envio = enviada` e `canal = whatsapp` bloqueia o candidato;
- erro anterior, etapa diferente e canal diferente permanecem elegíveis;
- se todos os candidatos já tiverem sucesso registrado, o fluxo retorna `NO_REMINDERS` e não chega ao nó Evolution;
- a leitura mantém saída mesmo com a aba vazia, permitindo a primeira tentativa;
- a regra foi validada com dados fictícios sem envio e sem escrita na planilha.
