# Testes Manuais — FINANCAS-MPD

Documento canônico dos testes manuais da **Fase 5 — Validação**. Esta suíte descreve o comportamento já implementado; não cria fase, funcionalidade ou regra nova.

Resultados executados não alteram o status inicial desta especificação. Eles devem ser registrados separadamente em [manual/EXECUTION_LOG.md](manual/EXECUTION_LOG.md).

## 1. Objetivo geral

Compreender e validar o funcionamento atual do PWA, confrontando o que aparece na interface com `contas_mensais`, `notificacoes` e `cotacoes_mensais`, incluindo persistência, agrupamento, conversão monetária, ações e idempotência.

## 2. Escopo

Incluído:

- PWA publicado em `https://financas-mpd.vercel.app`;
- listagem e agrupamento das contas;
- apresentação de ARS e BRL;
- identificação de contas manuais e em débito automático;
- seleção, pagamento, adiamento e ignorar via endpoint controlado;
- reflexo dos status na interface e em `contas_mensais`;
- registros de auditoria de notificações;
- cotação mensal e geração idempotente de ocorrências;
- uso no iPhone já previsto na Fase 5.

Excluído:

- alteração do código, contrato, planilha estrutural ou workflows;
- criação de funcionalidades;
- refatoração de autenticação;
- automação com Playwright ou MCP nesta entrega documental;
- injeção artificial de falha ou envio real sem autorização específica.

As abas de despesas e configurações são pré-condições já validadas. No modelo técnico, o cadastro recorrente canônico é `despesas_config`.

## 3. Pré-condições

- Aplicação publicada e acessível.
- Modo vigente registrado como `publico_temporario`.
- Fuso operacional `America/Sao_Paulo`.
- Abas e cabeçalhos iguais aos definidos em [DATA_MODEL.md](../docs/DATA_MODEL.md).
- Despesas e configurações previamente conferidas.
- Baseline de `contas_mensais`, `notificacoes` e `cotacoes_mensais` relido no início da rodada.
- Para testes locais, usar `contas_mensais_dev`, previamente copiada de `contas_mensais_prod`; a aba produtiva deve permanecer preservada.
- Para validação de produção, usar `contas_mensais_prod` e registrar o baseline antes de qualquer ação mutável.
- Workflow diário das 08:00 já concluído ou sua possível concorrência registrada.
- Para testes mutáveis, conta reservada e snapshot prévio de `status`, `pago_em`, `adiada_para`, `ignorada_em` e `atualizado_em`.
- Plano de restauração disponível antes de confirmar qualquer pagamento, adiamento ou ignorar.
- Envio de WhatsApp autorizado imediatamente antes do teste correspondente.

Referência conhecida em 22/07/2026, que deve ser confirmada novamente no início da rodada:

- 18 despesas ativas;
- 36 contas, 18 em julho e 18 em agosto de 2026;
- resumo `17 vencidas / 1 vence hoje / 18 próximas`;
- ARS `2.493.545` e BRL `8.598,43` por competência;
- cotação `290 ARS/BRL` em julho e agosto.

## 4. Validações na tela

- Cabeçalho somente com “Finanças MPD”.
- Resumo com Não Pagas, Hoje e A Pagar.
- Quantidade do resumo igual à quantidade de cards em cada grupo.
- Filtros locais Todas, Não Pagas, Hoje e A Pagar abaixo do resumo.
- Cards com nome, categoria, tipo, data, ARS e BRL.
- ARS como valor principal e BRL como secundário.
- `Manual` e `Débito aut.` coerentes com a configuração.
- Botão de pagamento ausente sem seleção e visível como `Pagar` após selecionar.
- Desmarcar checkboxes ou trocar filtro limpa seleção sem persistência.
- Pagamento remove o card após sucesso; ignorar permanece como comportamento de endpoint controlado, sem botão no frontend atual.
- Adiamento mantém o card, usa a nova data e recalcula seu grupo.
- Trocar filtro limpa seleção e não altera os contadores globais.
- Recarregar preserva operações confirmadas pela API.
- Em falha, a interface mantém o estado anterior e mostra mensagem simples.
- Layout utilizável no Safari e quando instalado na tela inicial do iPhone.

## 5. Conferências em `contas_mensais`

- `conta_id` único e não vazio.
- `despesa_id` existente no cadastro técnico.
- Combinação única `despesa_id + competencia`.
- Datas civis válidas e competência coerente.
- ARS em `valor_original/moeda_original` e BRL em `valor_convertido/moeda_convertida`.
- `valor_convertido = round(valor_original / cotacao_usada, 2)` para contas originalmente em ARS.
- Status permitido: `pendente`, `paga`, `adiada`, `ignorada` ou `cancelada`.
- Pagamento altera somente `status`, `pago_em` e `atualizado_em`.
- Adiamento altera somente `status`, `adiada_para` e `atualizado_em`.
- Ignorar altera somente `status`, `ignorada_em` e `atualizado_em`.
- `paga`, `ignorada` e `cancelada` não são retornadas na listagem.
- `adiada` usa `adiada_para` como data efetiva.

## 6. Conferências em `notificacoes`

- `notificacao_id` único.
- `conta_id` existente em `contas_mensais`.
- Etapa no formato `D0`, `D-<n>` ou `D+<n>`, calculada pela data efetiva.
- Timestamp ISO com offset.
- Canal `whatsapp`.
- Status `enviada` ou `erro`.
- Uma linha por conta incluída na tentativa consolidada.
- Sucesso anterior não bloqueia novo envio diário enquanto a conta continuar pendente ou adiada.
- Registro `erro`, etapa diferente ou canal diferente não bloqueia nova tentativa.
- Nenhuma gravação de notificação altera o estado financeiro da conta.

## 7. Conferências em `cotacoes_mensais`

- Uma linha única por competência.
- Cotação numérica maior que zero.
- Convenção de ARS equivalentes a `1 BRL`.
- `atualizado_em` com offset e `atualizado_por` preenchido.
- Julho e agosto de 2026 com cotação `290` na referência atual.
- Mesma taxa copiada para `contas_mensais.cotacao_usada`.
- Ausência, duplicidade ou valor inválido impedem geração mensal.
- Alterações futuras não recalculam automaticamente ocorrências já criadas.

## 8. Casos de teste

### TM-01 — Listagem de contas

- **Status inicial:** `Pendente`
- **Pré-condição:** baseline relido e despesas relacionadas ativas.
- **Ação manual:** abrir o PWA e comparar todos os cards com `contas_mensais` e `despesas_config`.
- **Resultado esperado na interface:** uma conta por ocorrência exibível, com todos os campos corretos e sem duplicidade visual.
- **Resultado esperado na base:** nenhuma escrita; IDs e referências permanecem únicos e válidos.
- **Critério de aprovação:** nenhuma conta ausente, excedente ou com dados trocados.

### TM-02 — Agrupamento temporal

- **Status inicial:** `Pendente`
- **Pré-condição:** data local da rodada registrada.
- **Ação manual:** calcular a data efetiva de cada conta e comparar com as três seções.
- **Resultado esperado na interface:** datas anteriores em Não Pagas, a data atual em Hoje e futuras em A Pagar; contadores coerentes.
- **Resultado esperado na base:** nenhuma escrita; `adiada_para` prevalece sobre `vencimento` nas contas adiadas.
- **Critério de aprovação:** soma dos grupos igual ao total e todas as contas classificadas corretamente.

### TM-03 — Valores em ARS e BRL

- **Status inicial:** `Pendente`
- **Pré-condição:** cotação da competência confirmada.
- **Ação manual:** conferir amostras e total usando a taxa gravada em cada ocorrência.
- **Resultado esperado na interface:** ARS principal sem centavos e BRL secundário com duas casas.
- **Resultado esperado na base:** moedas, taxa e arredondamento conforme o modelo.
- **Critério de aprovação:** amostras e totais conferem sem diferença de arredondamento.

### TM-04 — Débito automático

- **Status inicial:** `Pendente`
- **Pré-condição:** ao menos uma conta `debito_automatico` exibível.
- **Ação manual:** localizar a conta, conferir o rótulo e selecioná-la sem confirmar pagamento; depois validar uma ocorrência vencida pela rotina automática.
- **Resultado esperado na interface:** rótulo `Débito aut.` e pagamento manual disponível; a conta some após a liquidação de `D+1`.
- **Resultado esperado na base:** seleção isolada não altera nada; a rotina usa `status = paga`, timestamps iguais e limpa `adiada_para`.
- **Critério de aprovação:** tipo correto, vencimento original preservado e repetição com zero atualizações.

### TM-05 — Seleção e cancelamento

- **Status inicial:** `Pendente`
- **Pré-condição:** nenhuma conta selecionada.
- **Ação manual:** selecionar duas contas e depois desmarcá-las ou trocar o filtro ativo.
- **Resultado esperado na interface:** botão `Pagar` aparece durante a seleção e desaparece quando não houver seleção.
- **Resultado esperado na base:** nenhuma alteração.
- **Critério de aprovação:** estado visual retorna integralmente ao inicial.

### TM-06 — Pagamento manual

- **Status inicial:** `Pendente`
- **Pré-condição:** conta manual pendente reservada e snapshot das colunas operacionais.
- **Ação manual:** selecionar, marcar como paga e recarregar o PWA.
- **Resultado esperado na interface:** feedback de sucesso, card removido e contador reduzido; card continua ausente após recarga.
- **Resultado esperado na base:** `status = paga`, `pago_em` e `atualizado_em` preenchidos; demais campos preservados.
- **Critério de aprovação:** somente a conta selecionada muda e a persistência é confirmada.

### TM-07 — Editar padrão da conta

- **Status inicial:** `Pendente`
- **Pré-condição:** conta pendente reservada e snapshot de `contas_mensais` e `despesas_config`.
- **Ação manual:** abrir o botão de três pontos, alterar nome, vencimento e valor, salvar e recarregar.
- **Resultado esperado na interface:** modal compacto com apenas três campos; feedback de sucesso; card atualizado após salvar e após recarga.
- **Resultado esperado na base:** em `contas_mensais`, `vencimento`, `valor_original`, `valor_convertido` e `atualizado_em` atualizados; em `despesas_config`, `nome`, `valor_estimado` e `dia_vencimento` atualizados.
- **Critério de aprovação:** campos fora do contrato de edição permanecem preservados e futuras gerações usam o novo padrão.

### TM-07A — Filtros locais da lista

- **Status inicial:** `Pendente`
- **Pré-condição:** listagem carregada com ao menos uma conta em qualquer grupo.
- **Ação manual:** alternar entre Todas, Não Pagas, Hoje e A Pagar.
- **Resultado esperado na interface:** cada filtro mostra somente os cards do grupo escolhido; Todas mostra todos os grupos; filtro vazio mostra mensagem de ausência; o resumo superior não muda.
- **Resultado esperado na base:** nenhuma alteração.
- **Critério de aprovação:** filtros não chamam API, limpam seleção ativa e não modificam contadores globais.

### TM-08 — Ignorar conta

- **Status inicial:** `Pendente`
- **Pré-condição:** conta pendente reservada e snapshot realizado.
- **Ação manual:** executar o endpoint de ignorar por cliente HTTP controlado e recarregar.
- **Resultado esperado na interface:** card removido e ainda ausente após recarga.
- **Resultado esperado na base:** `status = ignorada`, `ignorada_em` e `atualizado_em` preenchidos; demais campos preservados.
- **Critério de aprovação:** somente a ocorrência escolhida é afetada.

### TM-09 — Filtro por status

- **Status inicial:** `Pendente`
- **Pré-condição:** existirem, durante a rodada controlada, contas pendente, adiada, paga e ignorada.
- **Ação manual:** recarregar a listagem e comparar os cards com os status da base.
- **Resultado esperado na interface:** pendente e adiada aparecem; paga e ignorada não aparecem; adiada usa a data operacional.
- **Resultado esperado na base:** nenhuma alteração pela consulta.
- **Critério de aprovação:** filtro e data efetiva correspondem integralmente à base.

### TM-10 — Auditoria de notificações

- **Status inicial:** `Pendente`
- **Pré-condição:** snapshot de `notificacoes` e `contas_mensais`.
- **Ação manual:** conferir todas as notificações e suas referências.
- **Resultado esperado na interface:** nenhuma mudança, pois o PWA não exibe o histórico.
- **Resultado esperado na base:** IDs únicos, referências válidas, etapas/canal/status válidos e contas financeiras inalteradas.
- **Critério de aprovação:** nenhuma referência órfã ou linha inválida.

### TM-11 — Auditoria de notificações

- **Status inicial:** `Pendente`
- **Pré-condição:** contas `pendente` ou `adiada` calculadas, grupo e instância confirmados e autorização explícita para envio real.
- **Ação manual:** executar o workflow uma vez, conferir o resultado e repetir a execução.
- **Resultado esperado na interface:** nenhuma mudança financeira; cada execução autorizada envia novamente as contas que continuam pendentes ou adiadas.
- **Resultado esperado na base:** cada execução registra uma linha de auditoria por conta enviada; `contas_mensais` fica intacta.
- **Critério de aprovação:** quantidade de registros igual às contas pendentes ou adiadas incluídas na mensagem; histórico anterior não bloqueia reenvio.

### TM-12 — Geração antecipada da competência seguinte no ciclo das 08:00

- **Status inicial:** `Pendente`
- **Pré-condição:** a cotação da competência seguinte possui uma única linha válida em `cotacoes_mensais`.
- **Ação manual:** validar o workflow diário de lembretes em execução controlada no dia correto, dois dias antes do último dia do mês, e repetir a execução sem envio real.
- **Resultado esperado na interface:** após geração, as contas da competência seguinte ficam disponíveis na listagem conforme seus vencimentos.
- **Resultado esperado na base:** todas as despesas ativas ausentes são criadas em `contas_mensais` para a competência seguinte antes da seleção dos lembretes; histórico é preservado e os pares `despesa_id + competencia` continuam únicos.
- **Critério de aprovação:** repetição registra zero inclusões, mês curto é ajustado e cotação ausente impede somente a geração, mantendo a montagem dos lembretes já existentes.

### TM-13 — Idempotência das ações

- **Status inicial:** `Pendente`
- **Pré-condição:** snapshots disponíveis e uma ação bem-sucedida executada em conta controlada.
- **Ação manual:** repetir pagamento, mesmo adiamento e ignorar usando painel Network ou cliente HTTP controlado.
- **Resultado esperado na interface:** nenhum segundo efeito visível e nenhuma conta adicional afetada.
- **Resultado esperado na base:** pagamento retorna `updated_count = 0`; adiamento e ignorar preservam os timestamps existentes.
- **Critério de aprovação:** repetição retorna sucesso idempotente sem nova escrita.

### TM-14 — Acesso e instalação no iPhone

- **Status inicial:** `Pendente`
- **Pré-condição:** PWA acessível no Safari e baseline registrado.
- **Ação manual:** abrir no Safari, adicionar à Tela de Início e reabrir pelo ícone.
- **Resultado esperado na interface:** mesmos dados do notebook, layout utilizável e abertura standalone.
- **Resultado esperado na base:** nenhuma alteração pela abertura ou instalação.
- **Critério de aprovação:** acesso e instalação funcionam sem divergência de dados.

## 9. Checkpoints e dependências

### Executar primeiro

1. Registrar baseline completo.
2. TM-01 — Listagem.
3. TM-02 — Agrupamento.
4. TM-03 — Valores.
5. TM-04 e TM-05 — Tipo e seleção sem escrita.

### Dependem de checkpoint anterior

- TM-06, TM-07 e TM-08 dependem de snapshot e plano de restauração.
- TM-09 depende dos estados controlados produzidos por TM-06 a TM-08.
- TM-13 depende de uma primeira ação bem-sucedida e de timestamps registrados.
- TM-11 depende da auditoria TM-10 e de autorização imediata para envio.
- TM-12 depende de competência e cotação previamente completas.

### Podem ser executados isoladamente

- TM-01, TM-02, TM-03 e TM-10, desde que haja baseline atual.
- TM-04 e TM-05, pois não escrevem na base.
- TM-14, desde que não seja usada uma ação financeira durante a validação.

### Dependem de integração ou validação externa

- TM-11 depende de n8n, Evolution API, grupo real do WhatsApp e autorização humana.
- TM-12 depende de execução manual do workflow n8n de geração.
- TM-13 depende de inspeção da resposta HTTP e leitura da base após cada repetição.
- TM-14 depende de um iPhone real e do Safari.

## 10. Encerramento e restauração

- Restaurar as colunas operacionais exclusivamente a partir dos snapshots.
- Recarregar o PWA e comparar com o baseline ajustado à data corrente.
- Preservar notificações reais autorizadas; não apagar evidência legítima.
- Registrar resultado, dispositivo, navegador, interface, base e evidência em [manual/EXECUTION_LOG.md](manual/EXECUTION_LOG.md).
- Não marcar a Fase 5 como concluída enquanto houver teste obrigatório pendente ou restauração não comprovada.
