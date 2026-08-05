# Plano Executivo do MVP

Este é o documento executável e a fonte oficial de status do projeto. As tarefas devem ser realizadas na ordem registrada. Uma tarefa só recebe `[x]` após implementação e teste com evidência verificável.

## Fase 1 — Estrutura (concluída)

- [x] Criar a estrutura inicial do projeto.
- [x] Criar `index.html`, `styles.css` e `app.js` em HTML, CSS e JavaScript puro.
- [x] Criar `manifest.json`.
- [x] Criar e registrar `service-worker.js`.

O deploy de produção foi realizado na Fase 3, depois da validação da interface e da camada de integração.

## Fase 2 — Interface (concluída)

- [x] Criar a interface mobile-first aprovada.
- [x] Renderizar contas da API agrupadas em Não Pagas, Hoje e A Pagar.
- [x] Criar seleção múltipla e controle de “Marcar como pagas”.
- [x] Criar “Cancelar seleção”.
- [x] Criar ações de Adiar e Ignorar integradas à API.
- [x] Exibir ARS como valor principal e BRL como valor secundário.
- [x] Separar a camada de API, renderização e ações do usuário.
- [x] Configurar o PWA para operar exclusivamente via API.

## Fase 3 — Integração (concluída)

### Preparação concluída

- [x] Definir o contrato dos quatro endpoints entre PWA e n8n.
- [x] Preparar a camada de API do frontend para usar os endpoints publicados.
- [x] Especificar a montagem operacional dos quatro webhooks.
- [x] Criar e testar os endpoints da API em modo de teste controlado.
- [x] Criar a estrutura inicial da planilha Google Sheets com dados controlados.

Os quatro workflows usam Google Sheets, foram validados em modo de teste e posteriormente publicados nas rotas nativas `/webhook/api/*`. As evidências estão em [N8N_EXECUTION_LOG.md](../docs/N8N_EXECUTION_LOG.md).

### Conectar n8n ao Google Sheets

Executar um endpoint por vez e registrar os testes antes de avançar.

- [x] Confirmar que a credencial Google Sheets existe e pode acessar a planilha no n8n.
- [x] Obter autorização explícita para alterar o workflow de `GET /api/accounts`.
- [x] Substituir o mock de `GET /api/accounts` pela leitura de `contas_mensais` e `despesas_config`.
- [x] Testar listagem, filtros, agrupamento, resumo, autenticação e ausência de dados internos.
- [x] Obter autorização explícita para alterar o workflow de `POST /api/accounts/pay`.
- [x] Substituir o mock de pagamento por leitura, validação integral e uma única atualização batch.
- [x] Testar atualização, atomicidade, estados incompatíveis e repetição idempotente.
- [x] Obter autorização explícita para alterar o workflow de `POST /api/accounts/postpone`.
- [x] Substituir o mock de adiamento pela leitura e atualização persistente.
- [x] Testar data, estados incompatíveis e repetição idempotente.
- [x] Obter autorização explícita para alterar o workflow de `POST /api/accounts/ignore`.
- [x] Substituir o mock de ignorar pela leitura e atualização persistente.
- [x] Testar estados incompatíveis e repetição idempotente.
- [x] Validar os quatro endpoints contra uma base de teste controlada e restaurar a massa quando necessário.

### Gerar contas mensais

- [x] Definir a regra de cotação ARS/BRL do MVP.
- [x] Criar e validar a aba `cotacoes_mensais` com dados controlados.
- [x] Criar o workflow diário de geração de contas mensais.
- [x] Refatorar e publicar a geração antecipada da competência seguinte.
- [x] Incorporar a geração mensal ao workflow diário de WhatsApp das `08:00` e arquivar o workflow separado de geração.
- [x] Ler somente despesas ativas.
- [x] Evitar duplicidade por `despesa_id + competencia`.
- [x] Testar geração e repetição idempotente com dados controlados.
- [x] Criar, testar e publicar a liquidação diária de débitos automáticos em `D+1`.
- [x] Diferenciar as etapas de lembrete por tipo de pagamento usando o vencimento original.

### Disponibilização e integração do PWA

- [x] Publicar o PWA na Vercel e registrar a URL final.
- [x] Definir e provisionar o token final e seu processo de rotação/revogação.
- [x] Configurar a política de retenção de execuções do n8n para proteger headers de autenticação.
- [x] Publicar os quatro workflows após aprovação e testes persistentes.
- [x] Configurar o proxy para preservar `/api/*` e tratar `OPTIONS` sem criar endpoint de negócio adicional.
- [x] Configurar CORS para a origem final do PWA.
- [x] Implementar no PWA o recebimento seguro do token por magic link, removendo-o da URL visível.
- [x] Configurar o PWA para usar exclusivamente a URL pública, sem segredo interno no frontend.
- [x] Validar listagem, pagamento, adiamento e ignorar pelo PWA contra os endpoints publicados.

### Critério de saída da Fase 3

- Os quatro endpoints usam Google Sheets e respeitam o contrato.
- Persistência, atomicidade e idempotência possuem evidência de teste.
- A geração mensal está validada como etapa do workflow diário de lembretes.
- PWA, proxy, CORS e autenticação funcionam no ambiente publicado.
- Evolution API não foi conectada nesta fase.

## Fase 4 — WhatsApp (concluída)

- [x] Confirmar a credencial Evolution API no n8n.
- [x] Identificar e validar o `groupJid` do grupo autorizado.
- [x] Testar um envio simples e controlado.
- [x] Criar o workflow diário de lembretes consolidados.
- [x] Aplicar as etapas de lembrete definidas para o MVP.
- [x] Registrar o resultado em `notificacoes`.
- [x] Impedir reenvio da mesma etapa para a mesma conta.
- [x] Testar falha de envio sem alterar indevidamente o estado financeiro da conta.
- [x] Publicar e ativar o workflow diário de lembretes consolidados após autorização explícita.

## Fase 5 — Validação (em andamento)

Plano e registro operacional: [testes manuais](../tests/MANUAL_TESTS.md) e [evidências por rodada](../tests/manual/EXECUTION_LOG.md). Esses documentos detalham os checkpoints desta fase sem criar uma fase adicional.

- [x] Cadastrar todas as contas controladas para a validação final.
- [x] Testar o fluxo completo de geração, visualização, ações e lembretes.
  - [x] Gerar agosto de 2026 e repetir a execução sem criar duplicidades.
  - [x] Executar o lembrete real do dia, registrar os três resultados e repetir sem reenvio.
  - [x] Regularizar os seis débitos automáticos vencidos e repetir a liquidação com zero atualizações.
  - [x] Validar ausência de cotação, mês curto e repetição sem duplicidade.
  - [x] Encerrar o ambiente temporário de simulação.
  - [x] Validar a PWA móvel sem sessão e a rejeição pública sem Bearer token.
  - [x] Abrir a PWA por magic link válido e testar listagem, pagamento, adiamento e ignorar com restauração do estado.
- [ ] Testar no iPhone.
- [ ] Instalar o PWA na tela inicial.
- [ ] Validar se Michele entende o fluxo sem explicação longa.
- [ ] Registrar problemas, correções e evidências finais do MVP.
