# Testes Manuais — Fase 5

> **Documento anterior preservado:** a suíte canônica vigente está em [../MANUAL_TESTS.md](../MANUAL_TESTS.md). Este arquivo permanece como referência da primeira organização; os resultados executados continuam em [EXECUTION_LOG.md](EXECUTION_LOG.md).

Este documento organiza a validação manual do funcionamento atual do FINANCAS-MPD. Ele pertence à **Fase 5 — Validação** e não cria uma nova fase, funcionalidade ou regra de negócio.

Os resultados devem ser registrados em [EXECUTION_LOG.md](EXECUTION_LOG.md). O modelo de dados permanece em [../../docs/DATA_MODEL.md](../../docs/DATA_MODEL.md), o contrato em [../../docs/API_CONTRACT.md](../../docs/API_CONTRACT.md) e o histórico n8n em [../../docs/N8N_EXECUTION_LOG.md](../../docs/N8N_EXECUTION_LOG.md).

## Objetivo

Validar o PWA publicado, sua correspondência com o Google Sheets, as ações persistentes, a geração mensal e os lembretes, produzindo evidência verificável e restaurando a massa controlada após ações destrutivas.

## Regras de execução

- Usar `https://financas-mpd.vercel.app` e registrar o deployment observado.
- Registrar `modo_acesso = publico_temporario` enquanto a exceção da Fase 5 estiver vigente.
- Usar `America/Sao_Paulo` como fuso operacional.
- Executar após o workflow diário das 08:00 ou registrar qualquer execução concorrente.
- Não alterar `despesas_config`, cotações, cabeçalhos, validações, workflows ou código durante os testes.
- Antes de alterar uma conta, copiar `status`, `pago_em`, `adiada_para`, `ignorada_em` e `atualizado_em`.
- Usar contas distintas para pagar manual, pagar débito automático, adiar e ignorar.
- Restaurar somente as colunas operacionais copiadas; nunca reconstruir valores de memória.
- Interromper a rodada se interface e planilha divergirem, se houver escrita fora das colunas esperadas ou se a restauração falhar.
- Um envio real ao WhatsApp exige checkpoint e autorização explícita imediatamente antes da execução.

## Baseline obrigatório

O baseline é dinâmico e deve ser relido no início de cada rodada. Em 22/07/2026, a referência controlada era:

- 18 despesas ativas;
- 36 contas, sendo 18 em `2026-07` e 18 em `2026-08`;
- resumo da tela `17 vencidas / 1 hoje / 18 próximas`;
- total por competência de ARS `2.493.545` e BRL `8.598,43`;
- cotação `290 ARS/BRL` para julho e agosto;
- contas inicialmente pendentes e com IDs únicos.

Os números acima não substituem a leitura no dia do teste. `notificacoes`, status, timestamps e agrupamentos podem mudar legitimamente.

## Conferências por superfície

### Interface

- Mesmas contas no notebook, Safari do iPhone e PWA instalado.
- Resumo coerente com os três grupos.
- Nome, categoria, tipo, data, ARS e BRL iguais à base.
- ARS principal e BRL secundário.
- Checkbox e Adiar acessíveis em cada card.
- Filtros Todas, Vencidas, Hoje e Próximas disponíveis abaixo do resumo.
- Botão de pagamento oculto sem seleção e exibido como `Pagar` com seleção.
- Mensagens simples de sucesso ou falha.
- Persistência após recarga no modo `api`.
- Conta paga desaparece; conta adiada permanece e usa a nova data.
- O botão de ignorar não fica exposto no frontend durante a validação atual.
- O status não é exibido como badge: deve ser inferido pelo agrupamento e confirmado na planilha.

### `contas_mensais`

- `conta_id` único e `despesa_id` existente.
- Um único par `despesa_id + competencia`.
- Valores, moedas, cotação e datas válidos.
- Somente `pendente` e `adiada` aparecem no PWA.
- Pagamento altera apenas `status`, `pago_em` e `atualizado_em`.
- Adiamento altera apenas `status`, `adiada_para` e `atualizado_em`.
- Ignorar altera apenas `status`, `ignorada_em` e `atualizado_em`.

### `notificacoes`

- `notificacao_id` único e `conta_id` existente.
- Etapa em `D-5`, `D-2`, `D-1`, `D0` ou `D+1`.
- Canal `whatsapp`, timestamp válido e status `enviada` ou `erro`.
- Somente `enviada` bloqueia a mesma chave `conta_id + etapa + canal`.
- O registro de notificação não modifica `contas_mensais`.

### `cotacoes_mensais`

- Uma única linha por competência.
- Cotação positiva, timestamp com offset e responsável preenchido.
- Para julho e agosto de 2026, taxa `290 ARS/BRL`.
- Cada ocorrência usa a taxa copiada em `cotacao_usada`.
- Alterar uma cotação não recalcula contas já criadas.

## Casos de teste

### TM-01 — Acesso em dispositivos diferentes

- **Pré-condição:** baseline registrado e modo público vigente.
- **Ação:** abrir a URL no Chrome do notebook e no Safari do iPhone, sem magic link.
- **Interface:** ambos exibem o mesmo conjunto e o mesmo resumo, sem aviso de token.
- **Base:** nenhuma célula muda.
- **Aprovação:** conteúdo equivalente nos dois dispositivos.

### TM-02 — Listagem completa

- **Pré-condição:** contas exibíveis relacionadas a despesas ativas.
- **Ação:** comparar todos os cards com `contas_mensais` e `despesas_config`.
- **Interface:** nome, categoria, tipo, data e valores correspondem à base.
- **Base:** IDs únicos, referências válidas e nenhuma duplicidade.
- **Aprovação:** nenhuma conta ausente, excedente ou com dados trocados.

### TM-03 — Agrupamento temporal

- **Pré-condição:** data local da rodada registrada.
- **Ação:** calcular a data efetiva usando `adiada_para` quando preenchida e `vencimento` nos demais casos.
- **Interface:** datas passadas em Vencidas, data atual em Vencem hoje e futuras em Próximas.
- **Base:** nenhuma mudança; os dados justificam todos os contadores.
- **Aprovação:** soma dos três grupos igual ao total exibido.

### TM-04 — ARS, BRL e cotação

- **Pré-condição:** cotação da competência confirmada.
- **Ação:** conferir amostras e totais usando `round(valor_original / cotacao_usada, 2)`.
- **Interface:** ARS principal sem centavos e BRL secundário com duas casas.
- **Base:** moedas `ARS/BRL`, taxa `290` e totais esperados por competência.
- **Aprovação:** amostras e total de BRL conferem sem diferença de arredondamento.

### TM-05 — Manual e débito automático

- **Pré-condição:** ao menos uma conta de cada tipo.
- **Ação:** comparar os dois cards com a configuração e selecioná-los sem confirmar pagamento.
- **Interface:** mostra `Manual` ou `Débito aut.`; ambos podem ser selecionados sem etapa bancária extra.
- **Base:** nenhuma alteração apenas por visualizar ou selecionar.
- **Aprovação:** tipo correto e comportamento previsto para ambos.

### TM-06 — Seleção e cancelamento

- **Pré-condição:** nenhuma seleção ativa.
- **Ação:** selecionar duas contas e depois desmarcar os checkboxes ou trocar o filtro ativo.
- **Interface:** `Pagar` aparece durante a seleção e desaparece quando a seleção é limpa.
- **Base:** nenhuma alteração.
- **Aprovação:** interface retorna ao estado inicial.

### TM-07 — Pagamento de conta manual

- **Pré-condição:** conta manual pendente reservada e snapshot das colunas operacionais.
- **Ação:** selecionar, marcar como paga e recarregar.
- **Interface:** feedback de sucesso, card removido e contador reduzido; permanece ausente após recarga.
- **Base:** `status = paga`; `pago_em` e `atualizado_em` preenchidos; demais campos preservados.
- **Aprovação:** somente a conta escolhida muda.

### TM-08 — Pagamento de débito automático

- **Pré-condição:** conta automática pendente reservada e snapshot realizado.
- **Ação:** validar o pagamento manual opcional; em teste separado, deixar outra conta passar para `D+1` e executar a liquidação das `00:05`.
- **Interface:** pagamento manual continua disponível; após a liquidação automática, o card desaparece.
- **Base:** em `D+1`, `status = paga`, `pago_em = atualizado_em`, `adiada_para` vazio e vencimento preservado.
- **Aprovação:** repetição da liquidação atualiza zero linhas.

### TM-09 — Adiamento e repetição

- **Pré-condição:** conta pendente reservada, fora dos lembretes do dia, e snapshot realizado.
- **Ação:** pressionar Adiar duas vezes no mesmo dia.
- **Interface:** primeira ação usa `vencimento original - 2 dias` quando essa data for futura; se a conta já venceu, vence hoje, vence amanhã ou vence em até dois dias, usa `data do teste + 7 dias`. O card é reagrupado pela nova data efetiva.
- **Base:** `status = adiada`, `adiada_para` correta e `vencimento` preservado; repetição não muda `atualizado_em`.
- **Aprovação:** data efetiva, grupo e idempotência conferem.

### TM-10 — Ignorar e repetição

- **Pré-condição:** conta pendente reservada e snapshot realizado.
- **Ação:** ignorar, recarregar e repetir a requisição pelo painel Network ou cliente HTTP.
- **Interface:** card desaparece e permanece ausente.
- **Base:** `status = ignorada`, `ignorada_em` e `atualizado_em` preenchidos; repetição preserva timestamps.
- **Aprovação:** nenhuma segunda alteração e nenhuma outra conta afetada.

### TM-11 — Status incompatível e atomicidade

- **Pré-condição:** uma conta paga e outra pendente sob controle da rodada.
- **Ação:** tentar adiar ou ignorar a paga e enviar pagamento múltiplo com um ID inválido.
- **Interface:** erro simples; nenhuma conta válida desaparece indevidamente.
- **Base:** `409` para estado incompatível ou `404` para ID inexistente, sem escrita parcial.
- **Aprovação:** todas as linhas e timestamps permanecem como antes da tentativa.

### TM-12 — Auditoria de notificações

- **Pré-condição:** snapshot de `notificacoes`.
- **Ação:** conferir todas as linhas e relacioná-las às contas.
- **Interface:** nenhuma mudança, pois o PWA não apresenta histórico de notificações.
- **Base:** IDs e referências válidos, enums corretos e nenhuma chave de sucesso duplicada.
- **Aprovação:** zero referência órfã ou duplicidade funcional.

### TM-13 — Envio real e deduplicação

- **Pré-condição:** contas restauradas, candidatos calculados, instância e grupo conferidos e autorização explícita obtida.
- **Ação:** executar o workflow de lembretes, conferir WhatsApp e planilha e executar novamente.
- **Interface:** nenhuma mudança financeira; primeiro envio consolidado chega e o segundo não se repete.
- **Base:** primeira execução cria uma linha por conta/etapa; segunda não cria linha para chave já `enviada`; `contas_mensais` fica idêntica.
- **Aprovação:** quantidade igual aos candidatos e repetição sem novo envio. Sem candidato, aguardar a próxima ocorrência natural; não fabricar dados.

### TM-14 — Geração contínua D+30

- **Pré-condição:** todas as competências necessárias entre hoje e `D+30` possuem uma única cotação válida.
- **Ação:** executar manualmente o gerador duas vezes.
- **Interface:** quantidade e cards permanecem iguais.
- **Base:** somente ocorrências ausentes dentro da janela são criadas; pares `despesa_id + competencia` permanecem únicos e contas antigas são preservadas.
- **Aprovação:** repetição resulta em zero inclusões; cotação ausente aborta sem escrita; dia inexistente usa o último dia do mês.

### TM-15 — Instalação no iPhone

- **Pré-condição:** acesso pelo Safari aprovado.
- **Ação:** adicionar à Tela de Início, abrir pelo ícone, fechar e abrir novamente.
- **Interface:** abre em modo standalone com layout e ações equivalentes ao navegador.
- **Base:** nenhuma alteração pela instalação ou abertura.
- **Aprovação:** instalação e reabertura funcionam sem divergência de dados.

### TM-16 — Comportamento offline

- **Pré-condição:** PWA instalada e aberta online pelo menos uma vez.
- **Ação:** ativar modo avião, reabrir, restaurar a conexão e recarregar.
- **Interface:** shell pode abrir; sem API, mostra falha simples e não inventa contas. Online, recupera a lista real.
- **Base:** nenhuma alteração durante a falha.
- **Aprovação:** falha segura e recuperação sem duplicidade.

### TM-17 — Uso por Michele

- **Pré-condição:** testes técnicos aprovados e uma conta reversível reservada.
- **Ação:** entregar o iPhone sem explicação longa e pedir que localize, selecione e pague a conta indicada.
- **Interface:** a usuária identifica o grupo, o checkbox e a ação principal.
- **Base:** somente a conta indicada muda e depois é restaurada.
- **Aprovação:** fluxo concluído sem intervenção operacional; dúvidas são apenas registradas.

### TM-18 — Restauração e regressão final

- **Pré-condição:** testes mutáveis encerrados.
- **Ação:** restaurar as colunas operacionais a partir dos snapshots e recarregar nos dispositivos.
- **Interface:** conjunto e resumo retornam ao baseline ajustado às notificações legítimas e à data atual.
- **Base:** contas restauradas, cotações intactas e somente notificações reais autorizadas preservadas.
- **Aprovação:** nenhuma diferença não explicada no comparativo final.

## Ordem e checkpoints

1. **Checkpoint 0 — documentação e baseline:** preencher o log e validar TM-01 a TM-05.
2. **Checkpoint 1 — iPhone sem escrita:** executar TM-06, TM-15 e TM-16.
3. **Checkpoint 2 — ações persistentes:** executar TM-07 a TM-11, uma conta por vez e com restauração comprovada.
4. **Checkpoint 3 — automações diárias:** executar a liquidação idempotente de TM-08 e a geração D+30 de TM-14 com cotações completas.
5. **Checkpoint 4 — notificações:** executar TM-12; TM-13 exige autorização imediatamente anterior ao envio.
6. **Checkpoint 5 — usuária principal:** executar TM-17 após estabilidade técnica.
7. **Checkpoint final:** executar TM-18 e emitir o veredito da rodada.

## Critério de saída

A rodada é aprovada somente quando todos os testes previstos possuem resultado e evidência, as divergências estão registradas, a massa financeira foi restaurada e não existe alteração estrutural ou envio real sem autorização.
