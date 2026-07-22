# Contexto para o Codex

Você está trabalhando no projeto Controle de Finanças MPD, um PWA simples para controle de contas recorrentes da Michele e Christian.

## Fontes de verdade

- Produto e escopo: `docs/PRD.md`.
- Comportamento: `docs/SPEC.md`.
- Decisões definitivas: `docs/DECISIONS.md`.
- Pendências reais: `docs/QUESTIONS.md`.
- Contrato público: `docs/API_CONTRACT.md`.
- Dados: `docs/DATA_MODEL.md`.
- Ordem e status executáveis: `tasks/MVP.md`.
- Evidências n8n: `docs/N8N_EXECUTION_LOG.md`.

Em caso de divergência, não inferir conclusão a partir de um mock ou preparação. `tasks/MVP.md` controla o status e só deve marcar `[x]` quando houver implementação e teste comprovados.

## Prioridades

1. Simplicidade extrema.
2. Interface amigável no iPhone.
3. HTML, CSS e JavaScript puro, sem framework.
4. PWA acessando somente endpoints controlados pelo n8n.
5. Google Sheets acessado somente pelo n8n.
6. WhatsApp via Evolution API somente na Fase 4.
7. Segurança de tokens, credenciais e dados financeiros.

## Fora do MVP

- React ou Next.js.
- Banco relacional.
- Login completo.
- App nativo.
- Controle financeiro avançado.
- Integração bancária.
