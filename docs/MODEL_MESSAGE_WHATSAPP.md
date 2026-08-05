# Modelo canônico da mensagem de WhatsApp

Este arquivo é a referência visual única para o layout da mensagem consolidada enviada pelo workflow de lembretes. Os nomes, valores e a data abaixo são apenas exemplos dos atributos dinâmicos; o que deve ser reproduzido na aplicação é a formatação.

## Atributos dinâmicos

- `data_base`: data da execução em `DD/MM/AAAA`.
- `nome`: nome da despesa, exibido em itálico.
- `valor_ars`: valor inteiro em ARS, sem centavos e em monoespaçado.
- `etapa`: atributo de auditoria calculado pela distância entre a data efetiva e a data base; hoje é `D0`, futuro é `D-<n>` e vencido é `D+<n>`.
- `grupo_apresentacao`: define o bloco visual da conta: `nao_pagas`, `hoje` ou `a_pagar`.
- `grupo_apresentacao_label`: label exibido ao usuário: `Não Pagas`, `Hoje` ou `A Pagar`.

## Regras de layout

- Os blocos seguem a mesma organização visual do PWA: `NÃO PAGAS`, `HOJE` e `A PAGAR`.
- O mapeamento visual é pela data efetiva: vencidas em `NÃO PAGAS`, vencendo na data base em `HOJE` e futuras em `A PAGAR`.
- Um bloco sem contas não aparece na mensagem.
- Dentro de cada bloco, as contas são ordenadas por data efetiva e nome.
- O valor convertido em BRL não aparece.
- A URL final permanece clicável e o envio usa `linkPreview = false`.
- Como o n8n não carrega este Markdown em tempo de execução, uma alteração neste modelo precisa ser implementada no workflow antes de chegar ao WhatsApp.


## Exemplo visual

💳 *Finanças MPD*
Data base: `02/08/2026`


*NÃO PAGAS*
- _Conta exemplo_: `60.000`
- _Conta exemplo_: `88.745`


*HOJE*
- _Conta exemplo_: `260.400`


*A PAGAR*
- _Conta exemplo_: `260.400`


Acesse o APP para mais informações:
https://financas-mpd.vercel.app/
