# Controle de Finanças MPD

Aplicação PWA simples para controle de contas recorrentes da Michele e Christian.

O sistema usa Google Sheets como base de dados no MVP, n8n como motor de automação, Evolution API para envio de mensagens em grupo no WhatsApp e uma aplicação web simples hospedada na Vercel.

## Objetivo

Facilitar o acompanhamento de contas manuais e automáticas, permitindo que Michele marque várias contas como pagas de forma simples pelo celular.

## Stack definida para o MVP

- HTML
- CSS
- JavaScript puro
- PWA
- Vercel
- Google Sheets
- n8n self-hosted
- Evolution API

## Documentação

- [PRD](docs/PRD.md) — problema, usuários e escopo do produto.
- [Especificação funcional](docs/SPEC.md) — tela, ações e regras.
- [Modelo de dados](docs/DATA_MODEL.md) — estrutura das abas do Google Sheets.
- [Workflows n8n](docs/N8N_WORKFLOWS.md) — automações previstas.
- [Decisões](docs/DECISIONS.md) — decisões já tomadas.
- [Questões](docs/QUESTIONS.md) — pontos ainda a definir antes das integrações.

## Execução

- [Índice de tarefas](tasks/TASKS.md)
- [Plano do MVP](tasks/MVP.md)
- [Backlog](tasks/BACKLOG.md)

## Contexto para agentes

- [Contexto do Codex](prompts/CODEX_SYSTEM_CONTEXT.md)
- [Prompt de implementação](prompts/IMPLEMENTATION_PROMPT.md)
- [Prompt de revisão](prompts/REVIEW_PROMPT.md)

## Ordem de trabalho

PRD → especificação → modelo de dados → tarefas → implementação faseada.

As fases devem ser implementadas e testadas uma por vez. A integração com n8n e, depois, com a Evolution API acontece somente após a estrutura e a interface.

## Status da implementação

- Fase 1 concluída: estrutura PWA estática em HTML, CSS e JavaScript puro, com manifest e service worker.
- Fase 2 concluída: interface mobile-first com dados fictícios, agrupamentos, seleção múltipla e ações locais.
- Fase 3 não iniciada: ainda não há integração com n8n ou Google Sheets.

## Baseline visual aprovado

A interface atual é a referência visual para as próximas fases:

- Cabeçalho contendo apenas “Finanças MPD”.
- Resumo superior com Vencidas, Vencem hoje e Próximas.
- Cards compactos agrupados nessas três seções.
- Categoria e tipo de pagamento na linha abaixo do título.
- Checkbox, Adiar e Ignorar como controles compactos no canto superior direito.
- ARS como valor principal e BRL como valor secundário menor.
- Sem textos auxiliares repetitivos ou badges internos de status nos cards.
