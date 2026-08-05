# Especificação Funcional

## Tela Principal

A tela principal exibe contas pendentes agrupadas por:

1. Não Pagas
2. Hoje
3. A Pagar

Cada conta deve exibir:

- Nome
- Categoria
- Tipo de pagamento: Manual ou Débito aut.
- Data de vencimento
- Valor principal em ARS
- Valor convertido em BRL menor e esmaecido
- Estado temporal indicado pelo agrupamento da seção

## Baseline Visual da Fase 2

- O cabeçalho exibe somente “Finanças MPD”.
- O resumo superior contém Não Pagas, Hoje e A Pagar.
- Abaixo do resumo há filtros locais para Todas, Não Pagas, Hoje e A Pagar.
- Cada seção usa um badge único com nome e quantidade.
- Os cards são compactos e adequados à largura de celular.
- O título ocupa a primeira linha; categoria e tipo de pagamento aparecem juntos logo abaixo.
- Checkbox e ações ficam no canto superior direito do card.
- Ações é representado por ícone de três pontos, com rótulo acessível.
- Data, ARS e BRL ocupam a faixa inferior do card.
- Não há badges internos de status nem textos auxiliares repetitivos.

## Ações

### Selecionar contas

O usuário pode selecionar uma ou mais contas.

### Pagar

O botão não aparece sem seleção. Ao selecionar uma ou mais contas pelo checkbox, aparece somente um botão ativo com o texto “Pagar”.

### Limpar seleção

Não há botão dedicado de cancelamento na interface atual. O usuário remove a seleção desmarcando os checkboxes ou trocando o filtro ativo.

### Editar padrão da conta

O botão de ações abre uma edição compacta com somente nome da dívida, data de vencimento e valor em ARS.

No modo vigente `api`, a edição chama `POST /api/accounts/update-pattern`. A ocorrência atual recebe `vencimento`, `valor_original`, `valor_convertido` recalculado e `atualizado_em`; o cadastro recorrente em `despesas_config` recebe `nome`, `valor_estimado` e `dia_vencimento`. A data enviada vira padrão futuro pelo dia do mês.

### Ignorar

Na Fase 2, esta ação removeu a conta apenas do estado local. No modo vigente `api`, a rota de backend pode persistir `status = ignorada`, `ignorada_em` e `atualizado_em` em `contas_mensais`, mas o botão de ignorar não está exposto no frontend durante a validação atual.

### Filtrar lista

Os filtros Todas, Não Pagas, Hoje e A Pagar alteram somente a renderização local. Eles não chamam a API, não alteram a planilha e não mudam os contadores do resumo superior. Ao trocar de filtro, a seleção atual é limpa para evitar pagamento de contas ocultas.

## Regras

- Conta paga não recebe novos lembretes.
- Conta ignorada não recebe novos lembretes naquela competência.
- Conta adiada volta a aparecer na nova data.
- A mensagem diária de WhatsApp inclui todas as contas `pendente` ou `adiada`, sem limitar por janela `D-*`.
- `D-*` é calculado apenas para auditoria em `notificacoes`: hoje é `D0`, futuro é `D-<n>` e vencido é `D+<n>`.
- A data efetiva do WhatsApp segue a mesma regra visual do PWA: `adiada_para` quando a conta está adiada e possui essa data, caso contrário `vencimento`.
- No início de `D+1`, às `00:05`, uma conta em débito automático ainda `pendente` ou `adiada` é marcada automaticamente como paga; o vencimento original permanece preservado.
- O workflow diário das `08:00` verifica, antes de montar o WhatsApp, se a data local é dois dias antes do último dia do mês; quando a guarda é atendida, cria a competência seguinte e relê `contas_mensais` antes de selecionar os lembretes.
- O layout da mensagem consolidada, seus atributos dinâmicos, a ordem dos blocos e a formatação de cada conta seguem a referência visual canônica em [MODEL_MESSAGE_WHATSAPP.md](MODEL_MESSAGE_WHATSAPP.md).
- `grupo_apresentacao` e `grupo_apresentacao_label` são atributos de apresentação, derivados de `grupo_visual`, da data efetiva ou da etapa, e não substituem a lógica operacional nem o registro histórico por `D-*`.
- A mensagem consolidada inclui a data base e a URL pública clicável do PWA. O envio solicita `linkPreview = false` e o HTML não publica `og:image`; clientes do WhatsApp ainda podem exibir um cartão textual compacto.
- Conta automática aparece identificada como “Débito aut.” na linha de categoria e tipo, sem badge interno.
- Edição de padrão não altera categoria, tipo de pagamento, moedas, status, pagamento, adiamento, origem, notificações ou cotações.
- O PWA opera exclusivamente via API. Pagamentos e edições de padrão persistem na planilha e devem continuar refletidos após recarregar a página.

## Recebimento do acesso

- Durante a validação do MVP, o PWA abre diretamente em qualquer dispositivo, sem token ou magic link.
- O bootstrap de token permanece no projeto, mas não bloqueia a interface nem participa das requisições no modo público.
- Após a validação, o mecanismo de acesso será refatorado antes de qualquer uso que exija privacidade.

## Integração do frontend

- O PWA usa exclusivamente a base pública `https://n8n.autamacao.shop/api`. A origem dos dados de teste ou produção é controlada na configuração dos workflows n8n.
- No modo público temporário, o frontend não envia o header `Authorization`.
- As respostas não são armazenadas em cache e as requisições não enviam cookies ou `Referer`.
- Campos textuais da conta são tratados como texto, nunca como HTML executável.
