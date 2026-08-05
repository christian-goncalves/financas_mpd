# Painel de Execução

O plano executável e a fonte oficial de status do MVP estão em [MVP.md](MVP.md). Uma tarefa recebe `[x]` somente quando sua implementação e seus testes previstos possuem evidência registrada.

## Estado atual

- Fase atual: **Fase 5 — Validação**.
- Estado: **em andamento**.
- Massa controlada cadastrada: **18 despesas recorrentes e 36 contas mensais, distribuídas entre julho e agosto de 2026; todas as contas de julho estão pagas, sendo seis débitos automáticos liquidados pela rotina e as demais confirmadas manualmente por Christian**.
- Validação concluída nesta rodada: **geração, visualização autenticada, ações, restauração, lembrete real, auditoria e deduplicação**.
- Próxima tarefa oficial: **testar o PWA no iPhone**.
- Limite da próxima tarefa: validar o uso móvel antes da instalação na tela inicial ou da validação com Michele.

## Dependências imediatas

- PWA publicado em `https://financas-mpd.vercel.app`.
- Projeto Vercel `financas-mpd` conectado ao repositório `christian-goncalves/financas_mpd`.
- Token e fluxo de magic link preservados para refatoração, mas temporariamente dispensados no modo público de validação do MVP.
- Política explícita de não retenção de dados aplicada aos quatro workflows da API.
- Quatro workflows da API publicados e validados nas rotas nativas `/webhook/api/*`.
- Proxy Traefik persistente validado nos quatro paths públicos `/api/*`, incluindo preflight.
- `FINANCAS_ALLOWED_ORIGIN` configurada como `https://financas-mpd.vercel.app` e validada no EasyPanel, Swarm, container e respostas públicas.
- PWA e quatro endpoints publicados em modo público temporário, acessíveis de qualquer dispositivo sem token.
- PWA configurado para operar via API com a base pública `https://n8n.autamacao.shop/api`, sem token embutido no frontend.
- Quatro fluxos públicos validados pelo PWA de produção; massa de teste controlada restaurada e política de não retenção confirmada.
- Teste controlado de falha do lembrete registrado em `notificacoes`, com `contas_mensais` inalterada e deduplicação confirmada.
- Workflow diário de lembretes `yQgTRvFBZvvsYKXs` publicado na versão testada, ativo com um gatilho às `08:00` em `America/Sao_Paulo`.
- Workflow de liquidação `uwtIrs8q6lCm6ZDZ` publicado e ativo diariamente às `00:05`.
- Geração da competência seguinte incorporada ao workflow diário de lembretes `yQgTRvFBZvvsYKXs` às `08:00`; o workflow separado `YZ70BdQtS7LPE72r` foi desativado e arquivado.
- Workflow SIM arquivado; as abas temporárias de contas e notificações foram removidas.
- Execuções manuais `6793` e `6794` geraram agosto e comprovaram idempotência; `6796` enviou três lembretes reais e `6797` não reenviou as mesmas etapas.
- O modo público foi validado sem token: a PWA renderizou 36 contas e as rotas de ação chegaram às validações de negócio sem alterar dados.

## Ordem macro

1. Fase 1 — Estrutura: concluída.
2. Fase 2 — Interface: concluída.
3. Fase 3 — Integração: concluída.
4. Fase 4 — WhatsApp: concluída.
5. Fase 5 — Validação: em andamento.

## Referências

- [Plano executável do MVP](MVP.md)
- [Backlog e itens fora do MVP](BACKLOG.md)
- [Contrato da API](../docs/API_CONTRACT.md)
- [Modelo de dados](../docs/DATA_MODEL.md)
- [Workflows n8n](../docs/N8N_WORKFLOWS.md)
- [Webhooks n8n](../docs/N8N_WEBHOOKS.md)
- [Questões pendentes](../docs/QUESTIONS.md)
