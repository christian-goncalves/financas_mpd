# Decisões do Projeto

Este documento registra decisões definitivas. Pontos ainda não resolvidos ficam exclusivamente em [QUESTIONS.md](QUESTIONS.md).

## Produto e arquitetura

- O MVP usará Google Sheets como base de dados.
- O frontend será HTML, CSS e JavaScript puro, sem React, Next.js ou outro framework.
- O app será um PWA hospedado na Vercel.
- A origem final do PWA será `https://financas-mpd.vercel.app`.
- O projeto Vercel `financas-mpd` ficará conectado ao repositório `christian-goncalves/financas_mpd`, com a pasta `app/` como saída estática.
- O n8n será self-hosted e será a única camada acessada pelo PWA para integrações.
- O PWA não acessará Google Sheets nem Evolution API diretamente.
- O WhatsApp será enviado para um grupo específico via Evolution API.
- A instância operacional da Evolution API para o FINANCAS-MPD será `8611`; a instância `christian` não será usada nos envios do projeto.
- O grupo autorizado será `FINANÇAS | MPD`, identificado pelo `groupJid` `120363429681130867@g.us`.
- O n8n usará a credencial `Evolution account`, do tipo `evolutionApi`, sem expor seu segredo em código, documentação, exports ou logs.
- Não haverá login completo no MVP.
- O acesso será por token longo recebido por magic link e enviado à API no header `Authorization`.
- O magic link entregará o token no parâmetro `token`; o PWA o consumirá antes dos demais assets, removerá o parâmetro com `history.replaceState` e preservará os demais componentes da URL.
- O token do PWA ficará somente em `sessionStorage` durante a sessão da aba, com fallback exclusivo para memória quando o armazenamento de sessão estiver indisponível; `localStorage`, IndexedDB e Cache Storage não serão usados.
- O documento do PWA usará política de referência `no-referrer`, e links com token inválido limparão o valor anterior da mesma sessão.
- O PWA operará em modo `api` com a base pública `https://n8n.autamacao.shop/api`; essa URL é configuração pública e não contém segredo.
- As requisições do PWA usarão `cache: no-store`, `credentials: omit`, `redirect: error` e `referrerPolicy: no-referrer`.
- Campos textuais retornados pela API serão escapados antes da inserção no HTML para impedir injeção de conteúdo capaz de acessar o token da sessão.
- Nenhum segredo interno do n8n, Google Sheets ou Evolution API ficará exposto no frontend.
- O token do PWA terá 256 bits aleatórios, codificados como 64 caracteres hexadecimais minúsculos, e ficará somente na variável `FINANCAS_PWA_TOKEN` do serviço n8n no EasyPanel.
- Haverá somente um token ativo no MVP, sem período de convivência; rotação e revogação substituirão o valor e reimplantarão o serviço n8n.
- O valor do token, fragmentos e derivados reutilizáveis não serão registrados em código, documentação, exports, respostas ou logs. O procedimento operacional está em [ACCESS_TOKEN.md](ACCESS_TOKEN.md).
- Os quatro workflows da API não salvarão dados de execuções bem-sucedidas, com erro ou manuais e não salvarão progresso por nó.
- A política de retenção será definida no nível desses quatro workflows, sem alterar globalmente a retenção dos demais projetos da instância n8n.
- As rotas nativas `/webhook/api/*` serão tratadas como implementação interna; o PWA usará somente os caminhos públicos `/api/*` após a configuração do proxy.
- O proxy será uma configuração dinâmica do Traefik em `/etc/easypanel/traefik/config/financas-mpd-api.yaml`, sem quinto webhook e sem alteração dos quatro workflows.
- Somente os quatro paths contratuais serão reescritos de `/api/...` para `/webhook/api/...`; outros paths não usarão o proxy FINANCAS-MPD.
- O preflight será respondido diretamente pelo middleware nativo de CORS do Traefik. Nesta versão ele retorna `200` sem body, resposta 2xx válida, em vez de `204`.
- `FINANCAS_ALLOWED_ORIGIN` terá como único valor `https://financas-mpd.vercel.app`; origens diferentes não receberão autorização CORS válida.

## Exceção temporária da Fase 5

- Para validar o MVP em qualquer dispositivo, o PWA e os quatro endpoints operarão temporariamente sem token a partir de 2026-07-22.
- O código de magic link, a variável do n8n e a documentação de autenticação serão preservados para futura refatoração.
- Esta decisão substitui temporariamente as regras de token acima, sem alterar CORS, validação de payload, regras financeiras ou retenção.
- Antes de uso além da validação controlada, a autenticação deverá ser redesenhada e reativada.

## Dados e regras operacionais

- A moeda principal exibida será ARS.
- O valor convertido em BRL será exibido menor e esmaecido.
- A cotação do MVP será manual e mensal, sem consulta a API cambial.
- A cotação representa quantos ARS equivalem a `1 BRL` e será cadastrada por Christian antes da geração de cada competência.
- Cada competência terá uma única cotação válida na aba `cotacoes_mensais`; se ela estiver ausente ou inválida, nenhuma conta daquela competência será criada.
- A cotação usada será copiada para `contas_mensais.cotacao_usada` e não recalculará ocorrências já geradas.
- Despesas configuradas em ARS usarão `BRL = ARS / cotacao`; despesas configuradas em BRL serão normalizadas para exibição com `ARS = BRL × cotacao`.
- Em `contas_mensais`, ARS será sempre armazenado como moeda e valor principais, e BRL como moeda e valor convertidos, independentemente da moeda cadastrada em `despesas_config`.
- Valores calculados serão arredondados para duas casas decimais antes da gravação.
- O fuso oficial para datas operacionais, timestamps e `grupo_visual` será `America/Sao_Paulo`.
- Contas com status `paga`, `ignorada` ou `cancelada` não aparecerão na listagem do PWA.
- Uma conta já paga retorna `200` idempotente em `POST /api/accounts/pay`, sem regravar `pago_em` ou `atualizado_em`.
- Uma conta já ignorada retorna `200` idempotente em `POST /api/accounts/ignore`, sem regravar `ignorada_em` ou `atualizado_em`.
- Repetir o mesmo adiamento retorna `200` idempotente sem regravar timestamps.
- Estados incompatíveis retornam `409` e não produzem alteração parcial.
- Em pagamento múltiplo, todos os IDs serão validados antes da escrita e as alterações ocorrerão em uma única operação batch.
- `updated_count` contará somente as linhas efetivamente alteradas; uma repetição totalmente idempotente retorna `updated_count: 0`.
- Os mocks serão substituídos pelo Google Sheets um endpoint por vez, com teste e evidência antes do endpoint seguinte.
- O workflow de liquidação executará diariamente às `00:05` em `America/Sao_Paulo` e marcará como pagas as contas de débito automático cujo vencimento original já passou.
- A liquidação automática preenche `status = paga`, usa o mesmo timestamp em `pago_em` e `atualizado_em`, limpa `adiada_para` e é idempotente.
- O workflow de geração executará diariamente às `06:00` em `America/Sao_Paulo` e garantirá a janela inclusiva entre hoje e `D+30`, sem remover histórico.
- Antes de qualquer escrita, a geração validará todas as cotações mensais necessárias à janela; qualquer ausência, duplicidade ou valor inválido abortará integralmente a execução.
- Na configuração atual, a cotação de setembro de 2026 deve ser cadastrada até `2026-08-02`.
- O workflow de lembretes executará diariamente às `08:00` em `America/Sao_Paulo`.
- Contas manuais recebem lembretes em `D-5`, `D-2`, `D-1`, `D0` e `D+1`; débitos automáticos recebem somente `D-2`, `D-1` e `D0`.
- As etapas de lembrete são sempre calculadas pelo `vencimento` original, inclusive quando a conta está adiada.
- Vencimentos configurados para dias inexistentes no mês-alvo serão ajustados ao último dia válido.
- O identificador das ocorrências geradas será determinístico no formato `conta_YYYY_MM_<despesa_id>`.
- Cada tentativa consolidada gerará uma linha em `notificacoes` por conta e etapa, mesmo que várias contas sejam enviadas na mesma mensagem.
- `notificacao_id` usará o formato `notif_<execution_id>_<sequencia>_<conta_id>_<etapa>`, normalizado para caracteres seguros, garantindo unicidade entre tentativas sem substituir a chave de deduplicação funcional.
- Somente `status_envio = enviada` bloqueará nova tentativa para a mesma combinação `conta_id + etapa + canal`; registros `erro`, outra etapa ou outro canal não bloquearão reenvio.
- As abas temporárias `Cópia de contas_mensais` e `notificacoes_teste` foram removidas após a simulação, e o workflow `FINANCAS-MPD - SIM - Lembretes WhatsApp` foi arquivado.

## Interface

- O tipo de pagamento aparecerá como texto na mesma linha da categoria, abaixo do título da conta.
- Contas automáticas serão identificadas nessa linha como “Débito aut.”, sem badge interno.
- Michele poderá marcar contas automáticas como pagas sem fluxo extra de confirmação bancária.

## Baseline visual aprovado

- O cabeçalho exibirá apenas “Finanças MPD”.
- O resumo superior exibirá somente Vencidas, Vencem hoje e Próximas.
- As contas serão apresentadas em cards compactos e mobile-first.
- Categoria e tipo de pagamento ficarão na linha abaixo do título.
- Checkbox, Adiar e Ignorar ficarão no canto superior direito; Adiar e Ignorar usarão ícones locais do Font Awesome.
- O estado temporal será comunicado pelo agrupamento da seção, sem badge interno de status.
- Textos auxiliares repetitivos não serão exibidos nos cards.
- ARS será o valor principal e BRL será apresentado menor como valor secundário.
