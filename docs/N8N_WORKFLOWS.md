# Workflows n8n

## Workflow 1 — Gerar contas mensais

Executa diariamente e garante que as próximas contas existam.

Função:

- Ler despesas ativas.
- Criar ocorrências futuras.
- Evitar duplicidade por despesa_id + competência.

## Workflow 2 — Enviar lembretes

Executa diariamente.

Função:

- Ler contas pendentes.
- Identificar vencidas, vencendo hoje e próximas.
- Gerar mensagem consolidada.
- Enviar para grupo WhatsApp via Evolution API.
- Registrar envio na aba notificacoes.

## Workflow 3 — Atualizar status pelo PWA

Recebe requisição do PWA.

Função:

- Receber lista de conta_id.
- Validar token.
- Atualizar status para paga, adiada ou ignorada.
- Registrar atualizado_em.
- Retornar sucesso para o PWA.
