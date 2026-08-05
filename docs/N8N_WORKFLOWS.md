# Workflows n8n

Este documento apresenta o inventário funcional dos workflows do MVP. O contrato HTTP dos quatro workflows da API está em [API_CONTRACT.md](API_CONTRACT.md), a montagem operacional em [N8N_WEBHOOKS.md](N8N_WEBHOOKS.md) e as evidências de execução em [N8N_EXECUTION_LOG.md](N8N_EXECUTION_LOG.md).

## Estado atual

- Os quatro endpoints usam Google Sheets e foram validados em modo de teste.
- Persistência, estados incompatíveis e idempotência possuem evidências registradas.
- Os quatro workflows da API estão publicados e nenhum acessa Evolution API.
- A planilha do MVP contém a massa controlada real: 18 despesas e 36 contas mensais entre julho e agosto de 2026.
- A credencial Google Sheets e o acesso de leitura à planilha foram confirmados no n8n em 2026-07-21.
- A regra de cotação manual mensal foi definida e a aba `cotacoes_mensais` foi criada, validada com dados controlados e localizada pela credencial Google Sheets do n8n.
- A geração antecipada da competência seguinte foi incorporada ao workflow diário de lembretes das `08:00`.
- O workflow diário de liquidação de débitos automáticos foi criado, validado, publicado e ativado às `00:05`.
- O PWA foi publicado em `https://financas-mpd.vercel.app`.
- O token final e seu processo de rotação/revogação estão registrados em [ACCESS_TOKEN.md](ACCESS_TOKEN.md).
- Os quatro workflows da API não retêm dados de execução, erros, testes manuais ou progresso por nó.
- As rotas nativas `/webhook/api/*` foram validadas sem alteração da planilha.
- Os quatro paths públicos `/api/*` e o preflight foram validados no proxy Traefik.
- O CORS está restrito à origem final `https://financas-mpd.vercel.app`.
- O recebimento seguro do token por magic link foi implementado e validado no PWA.
- O PWA opera exclusivamente via API com a base pública, sem token embutido nos assets.
- Listagem, pagamento, adiamento e ignorar foram validados pelo PWA de produção; a massa de teste controlada foi restaurada ao final.
- A Fase 3 foi concluída.
- A credencial `Evolution account`, a instância `8611` e o grupo `FINANÇAS | MPD` (`120363429681130867@g.us`) foram validados sem exposição de segredo.
- Um envio simples e controlado foi aceito pela Evolution API com HTTP `201`.
- O workflow diário de lembretes consolidados foi criado, validado e publicado, incluindo registro de sucesso e erro em `notificacoes`.
- O envio diário passou a listar todas as contas `pendente` ou `adiada`; `D-*` é mantido apenas como auditoria.
- O registro de resultados `enviada` ou `erro` na aba `notificacoes` foi implementado sem executar o workflow.
- A prevenção de reenvio por `conta_id + etapa + canal` foi implementada e validada sem executar o workflow.
- A geração mensal criou 18 contas de agosto e a repetição não criou duplicidades.
- O workflow diário envia a lista consolidada das contas ainda pendentes ou adiadas e registra os resultados em `notificacoes`.
- O modo público temporário foi publicado nos quatro endpoints; a PWA sem token renderizou 36 contas e as rotas de ação alcançaram suas validações de negócio.

## Workflows da API

### Listar contas

- Método e endpoint: `GET /api/accounts`.
- Estado atual: leitura de `contas_mensais` e `despesas_config` validada em modo de teste, com filtros, `grupo_visual` e resumo coerentes.
- Publicado na rota nativa `GET /webhook/api/accounts` e exposto pelo proxy em `GET /api/accounts`.
- Rascunho preparado em 2026-08-04 adiciona `grupo_apresentacao` e `grupo_apresentacao_label` ao payload, sem remover `grupo_visual`; publicação pendente de autorização explícita.

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

### Atualizar padrão da conta

- Método e endpoint: `POST /api/accounts/update-pattern`.
- Estado atual: rascunho `MYlUbx7d3Vs1UJWK`, pendente de publicação e teste persistente.
- Função: atualizar nome, vencimento e valor da ocorrência mensal atual e persistir nome, dia de vencimento e valor estimado em `despesas_config` para próximas gerações.
- Escopo preservado: não altera categoria, tipo de pagamento, moedas, status, pagamento, adiamento, origem, notificações ou cotações.

Os quatro workflows publicados da API foram conectados e testados contra uma base de teste controlada, com restauração da massa após os testes. O endpoint de atualização de padrão permanece em rascunho até autorização de publicação.

## Gerar contas mensais

Workflow separado desativado e arquivado em 2026-08-04. A lógica foi incorporada ao workflow diário de lembretes.

- Nome: `FINANCAS-MPD - Gerar contas mensais`.
- ID: `YZ70BdQtS7LPE72r`.
- Estado: desativado e arquivado.
- Última função: gerar a competência seguinte em workflow separado.
- Motivo da desativação: o envio contratado é o ciclo diário das `08:00`; a geração agora ocorre antes da montagem do WhatsApp nesse mesmo workflow.

Regra atual dentro do workflow de lembretes:

- o agendamento único permanece diariamente às `08:00`, em `America/Sao_Paulo`;
- antes de montar a mensagem, o fluxo verifica se a data local é exatamente dois dias antes do último dia do mês;
- quando a guarda é atendida, a competência alvo é exclusivamente o mês seguinte;
- vencimentos de dias inexistentes no mês são limitados ao último dia válido;
- depois da geração, ou da decisão de não gerar, o fluxo relê `contas_mensais` e só então seleciona os lembretes.

Regra de cotação definida:

- ler uma cotação manual da competência alvo em `cotacoes_mensais`;
- interpretar a cotação como ARS equivalentes a `1 BRL`;
- validar a competência alvo antes da escrita e abortar integralmente quando a cotação estiver ausente, duplicada ou inválida;
- normalizar todas as ocorrências para ARS como principal e BRL como convertido;
- copiar a taxa aplicada para `cotacao_usada` e não recalcular contas já geradas.

Função atual:

- Executar como etapa interna do workflow diário de WhatsApp das `08:00`.
- Ler despesas ativas em `despesas_config`.
- Criar em `contas_mensais` todas as ocorrências ausentes da competência seguinte.
- Preservar contas antigas como histórico.
- Evitar duplicidade pela combinação `despesa_id + competencia`.
- Aplicar a regra de cotação manual mensal definida para o MVP.
- Quando a cotação alvo estiver ausente, duplicada ou inválida, não criar novas contas e seguir com os lembretes das contas já existentes.

Alteração consolidada em 2026-08-04:

- a geração mensal foi movida para o workflow `FINANCAS-MPD - Lembretes consolidados diários`;
- versão publicada atual do workflow consolidado: `7ca91aad-9452-490c-bde7-052d7ba8d86f`;
- o workflow separado `YZ70BdQtS7LPE72r` foi desativado e arquivado;
- nenhum envio real de WhatsApp nem geração manual com escrita foi executado após a publicação.

Validação operacional anterior à mudança de regra, realizada em 2026-07-23:

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
- Verificar se é o dia de geração mensal e, quando aplicável, criar as contas ausentes da competência seguinte antes dos lembretes.
- Reler `contas_mensais` após a etapa de geração ou após a decisão de não gerar.
- Selecionar todas as contas pendentes ou adiadas.
- Calcular a data efetiva pela mesma regra visual do PWA: `adiada_para` para conta adiada com data, ou `vencimento` nos demais casos.
- Calcular `D-*` apenas como metadado de auditoria da data efetiva.
- Gerar uma mensagem consolidada.
- Agrupar visualmente a mensagem em `NÃO PAGAS`, `HOJE` e `A PAGAR`.
- Enviar para o grupo autorizado via Evolution API.
- Registrar uma linha por conta e etapa em `notificacoes`, com `status_envio = enviada` ou `erro`.
- Não usar `notificacoes` para bloquear reenvio diário; enquanto a conta continuar pendente ou adiada, ela volta a aparecer na mensagem.

Formato da mensagem:

- A referência visual única é [MODEL_MESSAGE_WHATSAPP.md](MODEL_MESSAGE_WHATSAPP.md). Ela define atributos dinâmicos, ordem dos blocos, omissão de blocos vazios, formatação das contas e URL final.
- O nó `Code - Preparar lembrete consolidado` implementa essa referência no n8n; alterações no Markdown precisam ser aplicadas ao nó antes de entrarem em produção.
- Cada conta é renderizada como `- _Nome_ - ` + valor inteiro em monoespaçado; o prefixo textual `ARS` não aparece na mensagem.
- O layout público usa os blocos `NÃO PAGAS`, `HOJE` e `A PAGAR`; internamente, `notificacoes.etapa` registra o deslocamento calculado como `D0`, `D-<n>` ou `D+<n>`.
- O envio mantém `linkPreview = false`; o PWA não publica `og:image`, embora o cliente do WhatsApp ainda possa renderizar metadados textuais.

O fluxo consolidado possui dezoito nós: Schedule, definição da competência alvo, leitura de `cotacoes_mensais`, leitura de `despesas_config`, leitura inicial de `contas_mensais`, preparação da geração, decisão de escrita, append opcional em `contas_mensais`, resumo da geração, releitura de `contas_mensais`, leitura de `notificacoes`, preparação do consolidado, verificação de lembretes, envio pela Evolution API, preparação dos registros de sucesso e erro e append em `notificacoes`. A versão publicada e ativa é `7ca91aad-9452-490c-bde7-052d7ba8d86f`, com execução diária às `08:00` em `America/Sao_Paulo`.

O layout canônico por blocos foi validado com dados sintéticos, sem envio e sem escrita em `notificacoes`. A ordem cronológica do vencido para o vencimento mais distante foi publicada na versão `4cf19c50-c809-4723-adef-75cddbfb0637` em 2026-08-02.

Em 2026-08-04, a montagem pública da mensagem foi publicada com `NÃO PAGAS`, `HOJE` e `A PAGAR`, preservando `notificacoes.etapa` com `D-*`, e a geração mensal foi integrada ao mesmo ciclo diário das `08:00`.

Em 2026-08-04, a seleção do WhatsApp foi ajustada para incluir todas as contas `pendente` ou `adiada`; a versão `f714b80a-a03f-49db-85f2-3971faf69e10` remove o bloqueio por `notificacoes` e mantém `D-*` apenas como auditoria.

Em 2026-08-04, o modelo de mensagem foi alinhado ao [MODEL_MESSAGE_WHATSAPP.md](MODEL_MESSAGE_WHATSAPP.md) sem o prefixo `ARS` antes dos valores. A versão `7ca91aad-9452-490c-bde7-052d7ba8d86f` renderiza as linhas como `- _Nome_ - ` + valor em monoespaçado.

Validação das etapas atualizada em 2026-07-23:

- histórico antigo: contas manuais usavam `D-5`, `D-2`, `D-1`, `D0` e `D+1`;
- histórico antigo: débitos automáticos usavam somente `D-2`, `D-1` e `D0`;
- regra atual: todas as contas `pendente` ou `adiada` entram na mensagem, e `D-*` é calculado pela data efetiva;
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

Auditoria vigente em `notificacoes`:

- a aba `notificacoes` recebe uma linha por conta incluída na tentativa consolidada;
- `notificacao_id` garante unicidade por execução, sequência, conta e etapa;
- histórico anterior não bloqueia novo envio diário;
- se não houver nenhuma conta `pendente` ou `adiada`, o fluxo retorna `NO_PENDING_ACCOUNTS` e não chega ao nó Evolution;
- a regra foi validada com dados controlados sem envio e sem escrita na planilha.
