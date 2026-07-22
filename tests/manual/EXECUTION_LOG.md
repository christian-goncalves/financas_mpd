# Registro de Execuções — Testes Manuais

Copie o modelo abaixo para cada rodada. Não substitua registros anteriores e não inclua tokens, magic links, credenciais ou conteúdo financeiro além do necessário para provar o teste.

## Rodada de 2026-07-22 — Em andamento

### Identificação

| Campo | Valor |
|---|---|
| Data | 2026-07-22 |
| Executor | Não informado |
| Fuso | `America/Sao_Paulo` |
| Modo de acesso | `publico_temporario` |
| URL | `https://financas-mpd.vercel.app` |
| Dispositivos e navegadores | Não informados |

### Resultados

| Teste | Resultado | Evidência | Observação |
|---|---|---|---|
| TM-01 — Acesso em dispositivos diferentes | **aprovado** | Validação manual informada pelo usuário | Detalhes de dispositivo, navegador e captura não informados. |
| TM-02 — Listagem completa | **aprovado** | Validação manual informada pelo usuário | Correspondência completa aprovada; captura ou conferência detalhada não informada. |

## Rodada automatizada de 2026-07-22 — Concluída

### Identificação

| Campo | Valor |
|---|---|
| Data e hora | 2026-07-22, entre 11:16 e 11:40 (`America/Sao_Paulo`) |
| Executor | Codex, por conectores Google Sheets e n8n, API HTTP e Chrome headless/CDP |
| Modo de acesso | `publico_temporario` |
| URL | `https://financas-mpd.vercel.app` |
| Base | `FINANCAS-MPD - DEV` (`1W6YJYbuRcjQZEij2bycv5ReeAvkSvTiuCNSaez-GrXY`) |
| Limitação do ambiente | Sem conector para Safari/iPhone físico, modo avião ou leitura do WhatsApp; esses critérios externos não foram presumidos como aprovados. |

### Baseline observado

| Verificação | Resultado |
|---|---|
| Despesas ativas | 18 |
| Contas totais | 36: 18 em `2026-07` e 18 em `2026-08` |
| Status | 35 `pendente` e 1 `paga` preexistente (`conta_2026_07_desp_aluguel_casa`) |
| Interface/API | 35 cards: 16 vencidas, 1 vence hoje e 18 próximas |
| Cotação | 290 ARS/BRL para julho e agosto |
| Notificações | 5 linhas válidas; 3 da execução 6796 e 2 da execução agendada 6803 |
| Diferença documental explicada | O exemplo `17/1/18` ficou desatualizado após o pagamento preexistente; o baseline vivo correto era `16/1/18`. |

### Resultados automatizados

| Teste | Resultado | Evidência objetiva |
|---|---|---|
| TM-01 — Acesso em dispositivos diferentes | **aprovado com evidência combinada** | Aprovação anterior do usuário para o acesso em dispositivos e Chrome automatizado sem token; nenhuma escrita causada pela abertura. |
| TM-02 — Listagem completa | **aprovado** | 35 contas retornadas pela API e 35 cards; zero divergência entre API, `contas_mensais` e `despesas_config`. |
| TM-03 — Agrupamento temporal | **aprovado** | Resumo calculado e renderizado: `16/1/18`; soma igual a 35. |
| TM-04 — ARS, BRL e cotação | **aprovado** | 36 ocorrências com ARS/BRL, taxa 290 e `round(valor_original / 290, 2)` válido; total por competência ARS 2.493.545 e BRL 8.598,43. |
| TM-05 — Manual e débito automático | **aprovado** | 12 contas exibíveis de débito automático e 23 manuais; rótulos e controles presentes sem escrita na seleção. |
| TM-06 — Seleção e cancelamento | **aprovado** | Duas seleções habilitaram pagamento; cancelamento zerou checkboxes, ocultou Cancelar e desabilitou pagamento; base intacta. |
| TM-07 — Pagamento manual | **aprovado** | `conta_2026_08_desp_aluguel_casa`: feedback de sucesso, remoção do card e alteração exclusiva para `paga`; snapshot restaurado. |
| TM-08 — Pagamento de débito automático | **aprovado** | `conta_2026_08_desp_netflix`: API 200, `updated_count=1`, somente `status/pago_em/atualizado_em`; snapshot restaurado. |
| TM-09 — Adiamento e repetição | **aprovado** | `conta_2026_07_desp_alquiler_coopser` foi para 2026-07-29 e grupo Próximas; repetição preservou as cinco colunas operacionais; snapshot restaurado. |
| TM-10 — Ignorar e repetição | **aprovado** | `conta_2026_08_desp_alquiler_ciama` desapareceu; repetição preservou timestamps; snapshot restaurado. |
| TM-11 — Status incompatível e atomicidade | **aprovado** | Adiar e ignorar conta paga retornaram 409 `INVALID_STATE`; lote com ID válido e inexistente retornou 404 `ACCOUNT_NOT_FOUND`; nenhuma escrita parcial. Requisições 6879, 6880 e 6881. |
| TM-12 — Auditoria de notificações | **aprovado** | 5 IDs únicos, referências válidas, enums válidos e nenhuma chave funcional de sucesso duplicada. |
| TM-13 — Envio real e deduplicação | **aprovado** | Execução natural 6803 registrou 2 linhas como `enviada`; repetição manual 6872 não duplicou registros. Captura fornecida pelo usuário confirmou o consolidado no grupo `FINANÇAS | MPD` às 08:00, contendo Seguro de mala praxis (`D+1`) e Arca (`D0`). |
| TM-14 — Geração mensal idempotente | **aprovado** | Execuções 6873 e 6874 concluíram com `created_accounts=0` e `appended_rows=0`; base permaneceu com 36 contas e 18 pares de agosto. |
| TM-15 — Instalação no iPhone | **aprovado** | Capturas fornecidas pelo usuário mostram abertura pelo ícone em modo standalone, sem barra do Safari, com 35 cards e resumo `16/1/18`, coerentes com API e planilha. |
| TM-16 — Comportamento offline | **aprovado** | Validação no iPhone: com modo avião ativo e Wi-Fi desligado, o PWA reabriu sem contas e sem dados fictícios; após reconectar, recuperou normalmente o resumo `16/1/18`. |
| TM-17 — Uso pela pessoa disponível | **encerrado com observação aceita** | O fluxo de pagamento foi validado. A seleção inicial da competência incorreta entre contas homônimas foi aceita como observação de usabilidade e não bloqueia o MVP. As duas ocorrências usadas no teste foram restauradas pelos snapshots/revisão anterior. |
| TM-18 — Restauração e regressão final | **aprovado** | Quatro snapshots restaurados via `userEnteredValue`; dropdowns preservados; API final com 35 contas e `16/1/18`; Chrome final com 35 cards e estado `Pronta para uso offline`; 5 notificações e cotações intactas. |

### Checkpoint de workflows

| Campo | Resultado |
|---|---|
| Lembretes | Workflow ativo `yQgTRvFBZvvsYKXs`; execução manual 6872; nenhuma nova linha após as 5 existentes. |
| Gerador mensal | Workflow `YZ70BdQtS7LPE72r`; execuções 6873 e 6874, ambas `success` e zero inclusões. |
| Envio real | Não foi fabricado candidato. A execução natural 6803 já havia criado as duas notificações elegíveis do dia. |

### Veredito

- **Aprovados:** 17 casos.
- **Encerrados com observação aceita:** TM-17.
- **Bloqueados:** nenhum.
- **Reprovados:** nenhum. O TM-17 foi encerrado com observação de usabilidade aceita.
- **Restauração:** concluída e relida; nenhuma alteração estrutural foi feita.
- **Baseline final:** 36 contas na planilha, 35 exibíveis, resumo `16/1/18`, 5 notificações e cotações de julho/agosto em 290.

## Diagnóstico automatizado de UX de 2026-07-22 — Concluído

### Identificação e baseline

| Campo | Valor |
|---|---|
| Horário da rodada | aproximadamente 15:24–15:29 (`America/Sao_Paulo`) |
| Executor | Codex, por Chrome headless/CDP, API HTTP, conector Google Sheets e conector n8n |
| Modo de acesso | `publico_temporario` |
| Aplicação | `https://financas-mpd.vercel.app` |
| Baseline vivo | 36 contas: 3 `paga` e 33 `pendente`; interface/API com 14 vencidas, 1 vence hoje e 18 próximas |
| Pagamentos preexistentes preservados | Aluguel casa, Alquiler Ciama e Alquiler Coopser de julho |
| Contas reservadas | Alquiler consultorio San Pedro e Pilates de agosto, linhas 23 e 24 |
| Snapshot J:N das duas contas | `pendente`, vazio, vazio, vazio, `2026-07-21T20:07:38.660-03:00` |

### Resultados controlados

| ID | Cenário | Resultado | Evidência objetiva |
|---|---|---|---|
| UX-01 | Selecionar uma conta e aguardar mais de 5 segundos | **aprovado** | Após 5,2 s, checkbox continuou selecionado e ocorreram zero chamadas a `/accounts/pay`; as colunas J:N permaneceram idênticas. |
| UX-02 | Selecionar duas contas e cancelar | **parcial** | Cancelamento zerou os checkboxes, ocultou Cancelar, desabilitou pagamento e não enviou POST nem alterou a base. O feedback `Seleção cancelada.` continuou visível após 3,4 s. |
| UX-03 | Confirmar o pagamento de duas contas | **parcial** | Houve exatamente um POST; a API atualizou somente `status`, `pago_em` e `atualizado_em`; os cards saíram após sucesso em cerca de 2,5 s. Imediatamente após o clique, porém, o botão ainda mostrava `Marcar como pagas`, permanecia habilitado e não tinha `aria-busy`. O feedback de sucesso ainda estava visível após 3,4 s. |
| UX-04 | Falha de rede durante pagamento | **parcial** | Com a rede desativada somente no Chrome de teste, a conta e a seleção foram preservadas e a base não mudou. O botão permaneceu habilitado durante a tentativa e o feedback de erro continuou visível após 4,6 s. |
| UX-05 | Cores e espaçamento dos controles | **reprovado para o ajuste solicitado** | Checkbox calculado em verde `rgb(47,125,92)`. Adiar e Ignorar calculados na mesma cor neutra `rgb(100,112,107)`, embora existam as variáveis amarela `#d59a2d` e vermelha `#b4423b`. Os três alvos medem 36×36 px, sem `gap`, com centros separados por 36 px; a área reservada no título é 108 px. |
| UX-06 | Gatilho e idempotência no n8n | **aprovado** | Workflow ativo `payMpdMock2026A1` possui um único webhook POST `/api/accounts/pay`, normaliza IDs duplicados e trata contas já pagas sem nova escrita. Não existe caminho GET ou seleção local que dispare pagamento. |

### Diagnóstico técnico

1. Selecionar ou cancelar não paga contas no código atual. `toggleAccountSelection()` e `clearSelection()` apenas alteram o `Set` local e renderizam; a única chamada de `payAccounts()` está em `handleMarkSelectedAsPaid()`, associado ao clique do botão principal. A reprodução automatizada confirmou zero POST e zero mutação nos dois cenários. O relato anterior de pagamento sem confirmação não foi reproduzido; sem histórico de execução retido pelo workflow, sua causa histórica não pode ser provada.
2. O feedback permanece porque `showFeedback(message)` apenas define `textContent`; não há temporizador nem cancelamento de temporizador anterior.
3. O botão não demonstra processamento porque `handleMarkSelectedAsPaid()` não mantém estado de operação, não troca o rótulo e não desabilita o botão antes de aguardar `payAccounts()`.
4. As cores solicitadas já existem como variáveis CSS, mas apenas o checkbox usa `--success`; Adiar e Ignorar herdam `--muted` no estado normal.
5. O espaçamento visual não vem de `gap` ou padding entre controles: cada controle ocupa uma caixa de 36×36 px e o título reserva exatamente 108 px. Reduzir essas caixas pela metade prejudicaria a área de toque; o ajuste deve compactar a aparência sem tornar os alvos menores ou sobrepostos.

### Plano mínimo executado nesta rodada

1. Em `app/styles.css`, Adiar usa `--warning`; o checkbox mantém `--success`; o grupo foi reduzido para dois controles, com reserva de 72 px no título e foco visível.
2. Em `app/app.js`, `showFeedback()` agora expira em aproximadamente 3 s e cancela o timer anterior.
3. Em `app/app.js`, o pagamento entra imediatamente em `Marcando...`, desabilita confirmação, cancelamento e controles, expõe `aria-busy` e impede segundo envio.
4. A seleção e os cards permanecem em caso de erro; a remoção ocorre somente após sucesso.
5. `app/service-worker.js` foi versionado para `v15` para invalidar o shell antigo do PWA.

### Verificação pós-alteração

| Verificação | Resultado |
|---|---|
| Planilha reduzida | API e `contas_mensais` refletiram 12 ocorrências ativas: 5 vencidas/hoje e 7 próximas; nenhuma célula foi alterada nesta rodada. |
| Ignorar no front-end | Aprovado: zero botões, ações ou seletores `ignore` renderizados; o endpoint/backend não foi removido. |
| Cores e controles | Aprovado: checkbox verde, relógio amarelo, dois alvos preservados e foco acessível. |
| Processamento de pagamento | Aprovado em simulação local: `Marcando...`, botão desabilitado, `aria-busy=true`, um único fluxo e seleção preservada até a resposta. |
| Badge | Aprovado em simulação local: feedback limpo após aproximadamente 3,2 s. |
| Atualização do PWA | O carregamento da aplicação busca novamente `/api/accounts`; como não há botão de atualizar, fechar e reabrir é o comportamento disponível para forçar nova leitura. |

### Riscos e regressões a observar

- Área de toque pequena ou sobreposição entre os três controles ao compactar o grupo.
- Duplo POST se o bloqueio não for aplicado antes do primeiro `await`.
- Timer antigo apagando uma mensagem mais recente.
- PWA instalado continuar servindo CSS/JS antigo se o cache não for versionado.
- Perda de seleção em falha de rede ou remoção otimista antes da confirmação da API.

### Restauração e integridade

- As linhas 23 e 24 foram restauradas em uma única atualização limitada a `userEnteredValue` nas colunas J:N.
- A releitura confirmou `pendente`, campos de pagamento/adiamento/ignorado vazios, timestamps originais e validações de dropdown preservadas.
- A API final retornou novamente 33 cards e resumo `14/1/18`.
- Nenhuma notificação foi criada, nenhuma cotação/cabeçalho foi alterada e nenhum workflow, API ou arquivo da aplicação foi modificado nesta rodada.

## Modelo de rodada

### Identificação

| Campo | Valor |
|---|---|
| Data e hora de início |  |
| Data e hora de término |  |
| Executor |  |
| Fuso | `America/Sao_Paulo` |
| Modo de acesso | `publico_temporario` |
| URL | `https://financas-mpd.vercel.app` |
| Deployment observado |  |
| Dispositivo e sistema |  |
| Navegador e versão |  |
| Workflow diário já executou? |  |

### Baseline anterior

| Verificação | Valor observado | Evidência |
|---|---|---|
| Despesas ativas |  |  |
| Contas totais |  |  |
| Contas `2026-07` |  |  |
| Contas `2026-08` |  |  |
| Vencidas |  |  |
| Vencem hoje |  |  |
| Próximas |  |  |
| Cotação de julho |  |  |
| Cotação de agosto |  |  |
| Linhas em `notificacoes` |  |  |
| Última notificação |  |  |

### Contas reservadas e restauração

| Uso | conta_id | Nome/competência | status | pago_em | adiada_para | ignorada_em | atualizado_em |
|---|---|---|---|---|---|---|---|
| Pagamento manual |  |  |  |  |  |  |  |
| Pagamento automático |  |  |  |  |  |  |  |
| Adiamento |  |  |  |  |  |  |  |
| Ignorar |  |  |  |  |  |  |  |
| Validação com Michele |  |  |  |  |  |  |  |

### Resultados

| Teste | Resultado (`aprovado`, `reprovado`, `bloqueado`, `não executado`) | Interface observada | Base observada | Evidência | Problema/observação |
|---|---|---|---|---|---|
| TM-01 |  |  |  |  |  |
| TM-02 |  |  |  |  |  |
| TM-03 |  |  |  |  |  |
| TM-04 |  |  |  |  |  |
| TM-05 |  |  |  |  |  |
| TM-06 |  |  |  |  |  |
| TM-07 |  |  |  |  |  |
| TM-08 |  |  |  |  |  |
| TM-09 |  |  |  |  |  |
| TM-10 |  |  |  |  |  |
| TM-11 |  |  |  |  |  |
| TM-12 |  |  |  |  |  |
| TM-13 |  |  |  |  |  |
| TM-14 |  |  |  |  |  |
| TM-15 |  |  |  |  |  |
| TM-16 |  |  |  |  |  |
| TM-17 |  |  |  |  |  |
| TM-18 |  |  |  |  |  |

### Checkpoint de envio real

| Campo | Valor |
|---|---|
| Autorização registrada |  |
| Data/hora da autorização |  |
| Candidatos calculados |  |
| Instância confirmada |  |
| Grupo confirmado |  |
| Execução inicial |  |
| Registros criados |  |
| Execução repetida |  |
| Novos registros na repetição |  |

### Baseline final

| Verificação | Valor observado | Diferença explicada? |
|---|---|---|
| Contas totais |  |  |
| Resumo da interface |  |  |
| Contas reservadas restauradas |  |  |
| Cotações preservadas |  |  |
| Linhas em `notificacoes` |  |  |
| Alterações estruturais |  |  |

### Veredito

- **Resultado da rodada:**
- **Restauração concluída:**
- **Problemas encontrados:**
- **Testes bloqueados:**
- **Próximo checkpoint autorizado:**
