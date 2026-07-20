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

Na Fase 2, simula localmente uma nova data de lembrete/vencimento operacional.

### Ignorar

Na Fase 2, remove localmente a conta da lista daquela competência.

## Regras

- Conta paga não recebe novos lembretes.
- Conta ignorada não recebe novos lembretes naquela competência.
- Conta adiada volta a aparecer na nova data.
- Conta automática aparece identificada como “Débito aut.” na linha de categoria e tipo, sem badge interno.
- As alterações simuladas da Fase 2 não persistem após recarregar a página.
