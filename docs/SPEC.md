# Especificação Funcional

## Tela Principal

A tela principal exibe contas pendentes agrupadas por:

1. Vencidas
2. Vencem hoje
3. Próximas

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
- O resumo superior contém Vencidas, Vencem hoje e Próximas.
- Abaixo do resumo há filtros locais para Todas, Vencidas, Hoje e Próximas.
- Cada seção usa um badge único com nome e quantidade.
- Os cards são compactos e adequados à largura de celular.
- O título ocupa a primeira linha; categoria e tipo de pagamento aparecem juntos logo abaixo.
- Checkbox e Adiar ficam no canto superior direito do card.
- Adiar é representado por ícone local, com rótulo acessível.
- Data, ARS e BRL ocupam a faixa inferior do card.
- Não há badges internos de status nem textos auxiliares repetitivos.

## Ações

### Selecionar contas

O usuário pode selecionar uma ou mais contas.

### Pagar

O botão não aparece sem seleção. Ao selecionar uma ou mais contas pelo checkbox, aparece somente um botão ativo com o texto “Pagar”.

### Limpar seleção

Não há botão dedicado de cancelamento na interface atual. O usuário remove a seleção desmarcando os checkboxes ou trocando o filtro ativo.

### Adiar

Na Fase 2, esta ação foi simulada localmente. No modo vigente `api`, ela persiste `status = adiada`, `adiada_para` e `atualizado_em` em `contas_mensais` após confirmação de sucesso do endpoint.

O PWA calcula o adiamento como uma soneca operacional: quando o vencimento original está a mais de dois dias, envia `adiada_para = vencimento - 2 dias`. Quando a conta já venceu, vence hoje, vence amanhã ou vence em até dois dias, usa o fallback `adiada_para = hoje + 7 dias`. O vencimento original não é alterado.

### Ignorar

Na Fase 2, esta ação removeu a conta apenas do estado local. No modo vigente `api`, a rota de backend pode persistir `status = ignorada`, `ignorada_em` e `atualizado_em` em `contas_mensais`, mas o botão de ignorar não está exposto no frontend durante a validação atual.

### Filtrar lista

Os filtros Todas, Vencidas, Hoje e Próximas alteram somente a renderização local. Eles não chamam a API, não alteram a planilha e não mudam os contadores do resumo superior. Ao trocar de filtro, a seleção atual é limpa para evitar pagamento de contas ocultas.

## Regras

- Conta paga não recebe novos lembretes.
- Conta ignorada não recebe novos lembretes naquela competência.
- Conta adiada volta a aparecer na nova data.
- Conta manual recebe lembretes em `D-5`, `D-2`, `D-1`, `D0` e `D+1`.
- Conta em débito automático recebe lembretes somente em `D-2`, `D-1` e `D0`.
- O lembrete usa sempre o vencimento original, inclusive para uma conta adiada.
- No início de `D+1`, às `00:05`, uma conta em débito automático ainda `pendente` ou `adiada` é marcada automaticamente como paga; o vencimento original permanece preservado.
- A geração diária das `06:00` mantém a janela inclusiva de ocorrências entre hoje e `D+30`.
- Cada lembrete do WhatsApp usa uma linha compacta no formato ``*nome* - _situação_ - `ARS valor` ``; o nome aparece em negrito, a situação em itálico, o valor ARS sem centavos em monoespaçado e o BRL não aparece.
- A mensagem consolidada inclui a data base e a URL pública clicável do PWA. O envio solicita `linkPreview = false` e o HTML não publica `og:image`; clientes do WhatsApp ainda podem exibir um cartão textual compacto.
- Conta automática aparece identificada como “Débito aut.” na linha de categoria e tipo, sem badge interno.
- No modo `demo`, as alterações são locais e desaparecem após recarregar. No modo vigente `api`, pagar, adiar e ignorar persistem na planilha e devem continuar refletidos após recarregar a página.

## Recebimento do acesso

- Durante a validação do MVP, o PWA abre diretamente em qualquer dispositivo, sem token ou magic link.
- O bootstrap de token permanece no projeto, mas não bloqueia a interface nem participa das requisições no modo público.
- Após a validação, o mecanismo de acesso será refatorado antes de qualquer uso que exija privacidade.

## Integração do frontend

- O modo vigente é `api` e usa a base pública `https://n8n.autamacao.shop/api`.
- No modo público temporário, o frontend não envia o header `Authorization`.
- As respostas não são armazenadas em cache e as requisições não enviam cookies ou `Referer`.
- Campos textuais da conta são tratados como texto, nunca como HTML executável.
