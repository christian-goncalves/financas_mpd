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
- O resumo superior contém apenas Vencidas, Vencem hoje e Próximas.
- Cada seção usa um badge único com nome e quantidade.
- Os cards são compactos e adequados à largura de celular.
- O título ocupa a primeira linha; categoria e tipo de pagamento aparecem juntos logo abaixo.
- Checkbox, Adiar e Ignorar ficam no canto superior direito do card.
- Adiar e Ignorar são representados por ícones locais, com rótulos acessíveis.
- Data, ARS e BRL ocupam a faixa inferior do card.
- Não há badges internos de status nem textos auxiliares repetitivos.

## Ações

### Selecionar contas

O usuário pode selecionar uma ou mais contas.

### Marcar como pagas

O botão começa desativado. Ao selecionar contas, o botão fica ativo.

### Cancelar seleção

Remove todas as seleções sem alterar dados.

### Adiar

Na Fase 2, esta ação foi simulada localmente. No modo vigente `api`, ela persiste `status = adiada`, `adiada_para` e `atualizado_em` em `contas_mensais` após confirmação de sucesso do endpoint.

### Ignorar

Na Fase 2, esta ação removeu a conta apenas do estado local. No modo vigente `api`, ela persiste `status = ignorada`, `ignorada_em` e `atualizado_em` em `contas_mensais` após confirmação de sucesso do endpoint.

## Regras

- Conta paga não recebe novos lembretes.
- Conta ignorada não recebe novos lembretes naquela competência.
- Conta adiada volta a aparecer na nova data.
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
