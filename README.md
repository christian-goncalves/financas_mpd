# Controle de Finanças MPD

Aplicação PWA simples para controle de contas recorrentes da Michele e Christian.

O sistema usa Google Sheets como base de dados no MVP, n8n como motor de automação, Evolution API para envio de mensagens em grupo no WhatsApp e uma aplicação web simples hospedada na Vercel.

## Objetivo

Facilitar o acompanhamento de contas manuais e automáticas, permitindo que Michele marque várias contas como pagas de forma simples pelo celular.

## Stack definida para o MVP

- HTML
- CSS
- JavaScript puro
- PWA
- Vercel
- Google Sheets
- n8n self-hosted
- Evolution API

## Documentação

- [PRD](docs/PRD.md) — problema, usuários e escopo do produto.
- [Especificação funcional](docs/SPEC.md) — tela, ações e regras.
- [Modelo de dados](docs/DATA_MODEL.md) — estrutura das abas do Google Sheets.
- [Workflows n8n](docs/N8N_WORKFLOWS.md) — automações previstas.
- [Contrato da API](docs/API_CONTRACT.md) — interface entre o PWA e o n8n.
- [Token de acesso](docs/ACCESS_TOKEN.md) — provisionamento, rotação e revogação do Bearer token.
- [Webhooks n8n](docs/N8N_WEBHOOKS.md) — especificação operacional dos endpoints.
- [Registro de execuções n8n](docs/N8N_EXECUTION_LOG.md) — evidências, IDs e limitações observadas.
- [Decisões](docs/DECISIONS.md) — decisões já tomadas.
- [Questões](docs/QUESTIONS.md) — pendências reais e etapas bloqueadas.
- [Testes manuais da Fase 5](tests/MANUAL_TESTS.md) — casos, checkpoints, critérios e restauração.
- [Registro dos testes manuais](tests/manual/EXECUTION_LOG.md) — baseline, resultados e evidências por rodada.

## Execução

- [Índice de tarefas](tasks/TASKS.md)
- [Plano do MVP](tasks/MVP.md)
- [Backlog](tasks/BACKLOG.md)

## Contexto para agentes

- [Contexto do Codex](prompts/CODEX_SYSTEM_CONTEXT.md)
- [Prompt de implementação](prompts/IMPLEMENTATION_PROMPT.md)
- [Prompt de revisão](prompts/REVIEW_PROMPT.md)

## Ordem de trabalho

PRD → especificação → decisões → contrato/modelo de dados → plano do MVP → implementação faseada.

As fases devem ser implementadas e testadas uma por vez. [tasks/MVP.md](tasks/MVP.md) é a fonte oficial da ordem e do status. Uma tarefa só é concluída quando implementação e teste possuem evidência.

## Status da implementação

- Fase 1 concluída: estrutura PWA estática em HTML, CSS e JavaScript puro, com manifest e service worker.
- Fase 2 concluída: interface mobile-first com agrupamentos, seleção múltipla e ações integradas à API.
- Fase 3 concluída: PWA, API n8n, Google Sheets, proxy, CORS e autenticação foram integrados e validados em produção.
- Fase 4 concluída: credencial Evolution API, instância `8611`, grupo autorizado, envio, registro de auditoria e tratamento de falha foram validados; o workflow diário está publicado e ativo.
- Os quatro endpoints da API usam Google Sheets e foram validados em modo de teste.
- Persistência, estados incompatíveis e idempotência possuem evidências registradas.
- A cotação do MVP foi definida como manual, mensal e armazenada por competência.
- A aba `cotacoes_mensais` foi criada e validada com dados de teste controlados.
- A geração da competência seguinte foi incorporada ao workflow diário de WhatsApp das `08:00`: antes de montar o lembrete, o fluxo verifica se a data local é dois dias antes do último dia do mês e cria as contas ausentes do mês seguinte quando a cotação alvo está válida.
- O workflow de liquidação está publicado às `00:05` e marca débitos automáticos vencidos como pagos de forma idempotente.
- O PWA foi publicado em produção em `https://financas-mpd.vercel.app` e seus arquivos essenciais foram validados.
- O código e o token de acesso foram preservados para futura refatoração, mas a exigência foi temporariamente desativada para a validação pública do MVP.
- Os quatro workflows da API foram configurados para não reter dados de execuções bem-sucedidas, com erro ou manuais, nem progresso por nó.
- Os quatro workflows da API foram publicados e validados nas URLs nativas de produção do n8n.
- O proxy público expõe os quatro endpoints em `/api/*`, preserva as rotas internas `/webhook/api/*` e trata preflight sem criar webhook adicional.
- A edição de padrão usa temporariamente a rota nativa publicada `POST /webhook/api/accounts/update-pattern` até o proxy Traefik expor o quinto path público `/api/accounts/update-pattern`.
- O CORS está restrito à origem final `https://financas-mpd.vercel.app` no EasyPanel, n8n e proxy Traefik.
- O PWA opera exclusivamente via API, usando a base pública `https://n8n.autamacao.shop/api` e, durante a validação do MVP, acessa os quatro endpoints sem token.
- `contas_mensais_prod` preserva os dados reais; `contas_mensais_dev` é a cópia usada para desenvolvimento e testes. A origem é selecionada na configuração dos workflows n8n.
- Listagem, adiamento, ignorar e pagamento foram executados pelo PWA de produção com dados de teste controlados; a planilha foi restaurada ao baseline `1/1/1` ao final.
- O workflow de lembretes está publicado às `08:00`; ele envia todas as contas `pendente` ou `adiada` da aba configurada, agrupadas como Não Pagas, Hoje e A Pagar. `D-*` é calculado apenas como auditoria em `notificacoes`.

## Deploy do PWA

- Produção: https://financas-mpd.vercel.app
- Projeto Vercel: `financas-mpd` (`prj_pXPALq7UJf4AVsLfCC7M7hWHATKY`)
- Deployment validado: `dpl_DtUPd7ze32JEU2cAMd5fQQ2fB2YE`, estado `READY`
- Repositório conectado: `christian-goncalves/financas_mpd`
- Validação em 2026-07-22: modo público sem token, 36 contas, quatro endpoints, CORS e interface em 430 px funcionaram em produção sem erros de runtime.

## Próxima tarefa oficial

Testar o PWA no iPhone.

A execução deve seguir a [suíte de testes manuais](tests/MANUAL_TESTS.md) e registrar cada resultado no [log de evidências](tests/manual/EXECUTION_LOG.md).

A Fase 5 possui 18 despesas recorrentes e 36 contas mensais de julho e agosto de 2026. Geração, visualização autenticada, pagamento, adiamento, ignorar, restauração, lembretes e auditoria de envio foram validados. A próxima etapa é o teste no iPhone.

## Baseline visual aprovado

A interface atual é a referência visual para as próximas fases:

- Cabeçalho contendo apenas “Finanças MPD”.
- Resumo superior com Não Pagas, Hoje e A Pagar.
- Cards compactos agrupados nessas três seções.
- Categoria e tipo de pagamento na linha abaixo do título.
- Checkbox e ações como controles compactos no canto superior direito.
- ARS como valor principal e BRL como valor secundário menor.
- Sem textos auxiliares repetitivos ou badges internos de status nos cards.
