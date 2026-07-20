# Decisões do Projeto

- O MVP usará Google Sheets como base de dados.
- O frontend será HTML, CSS e JavaScript puro.
- O app será PWA.
- A hospedagem será na Vercel.
- O n8n será self-hosted.
- O WhatsApp será enviado via Evolution API.
- O envio será para grupo específico.
- Não haverá login no MVP.
- O acesso será por token longo.
- A moeda principal exibida será ARS.
- O valor em BRL será exibido menor e esmaecido.
- O tipo de pagamento aparecerá como texto na mesma linha da categoria, abaixo do título da conta.
- Contas automáticas serão identificadas nessa linha como “Débito aut.”, sem badge interno.
- Michele poderá marcar contas automáticas como pagas sem fluxo extra de confirmação bancária.

## Baseline visual aprovado

- O cabeçalho da aplicação exibirá apenas “Finanças MPD”.
- O resumo superior exibirá somente Vencidas, Vencem hoje e Próximas.
- As contas serão apresentadas em cards compactos e mobile-first.
- Categoria e tipo de pagamento ficarão na linha abaixo do título.
- Checkbox, Adiar e Ignorar ficarão no canto superior direito; Adiar e Ignorar usarão ícones locais do Font Awesome.
- O estado temporal da conta será comunicado pelo agrupamento da seção, sem badge interno de status.
- Textos auxiliares repetitivos não serão exibidos nos cards.
- ARS será o valor principal e BRL será apresentado menor como valor secundário.
