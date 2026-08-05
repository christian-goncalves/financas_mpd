# Token de Acesso do PWA

Este documento define o provisionamento, a rotação e a revogação do Bearer token usado entre o PWA e os endpoints controlados pelo n8n. O valor do token nunca deve ser registrado neste repositório, em documentação, exports de workflow, respostas HTTP ou logs de aplicação.

## Exceção temporária para validação do MVP

- Desde 2026-07-22, o PWA e os quatro endpoints estão em modo público e não exigem Bearer token.
- O código de autenticação, o token do n8n e o arquivo local protegido foram mantidos apenas para futura refatoração e reversão.
- Esta exceção permite acesso por qualquer dispositivo, mas também permite que qualquer pessoa com a URL leia e altere as contas.
- CORS, validação de payload, regras de estado, `Cache-Control: no-store` e ausência de credenciais internas nas respostas permanecem ativos.

## Estado anterior preservado

- Token final provisionado em 2026-07-21 às 12:26:25 (`America/Sao_Paulo`).
- Formato: 256 bits aleatórios codificados como 64 caracteres hexadecimais minúsculos.
- Fonte persistente: variável `FINANCAS_PWA_TOKEN` do serviço n8n no EasyPanel.
- Verificação concluída entre configuração persistente do EasyPanel, especificação do Docker Swarm e ambiente do container n8n em execução.
- O valor não está versionado; existe somente em `.env.local`, ignorado pelo Git e protegido com permissão `600`, além da variável persistente do n8n.
- Os quatro workflows da API estão configurados para não salvar dados de execuções, inclusive erros e execuções manuais, evitando persistência do header `Authorization`.
- O token final foi validado nas rotas nativas publicadas: Bearer válido foi aceito e token ausente ou inválido recebeu `401 UNAUTHORIZED`.
- As rotas públicas `/api/*` aceitam CORS somente para `https://financas-mpd.vercel.app`; a configuração foi validada sem expor o token.
- O PWA recebe `?token=...`, valida o formato, remove o parâmetro imediatamente da URL visível e mantém o valor somente em `sessionStorage` ou, se esse recurso estiver indisponível, na memória da página.
- O bootstrap de autenticação foi validado com token de teste; o valor final não foi usado nem exposto nos testes de frontend.
- O frontend está configurado em modo `api`; o header `Authorization` é montado em tempo de execução a partir da sessão e nunca é persistido nos assets.

## Regras do MVP

- Existe somente um token ativo; não haverá janela de convivência entre token antigo e novo.
- A API aceita o token apenas no header `Authorization: Bearer <token>`.
- Query param é usado somente no recebimento do magic link pelo PWA e é removido imediatamente da URL visível.
- O token não pode ser incluído em `app.js`, assets estáticos, commits, mensagens de erro ou dados de execução.
- O token fica em `sessionStorage`, nunca em `localStorage`, IndexedDB ou Cache Storage, e deixa de existir quando a sessão da aba é encerrada.
- A página usa política `Referrer-Policy: no-referrer` por metadado para impedir que a URL de entrada seja propagada como referência aos assets carregados.
- Um token recebido com formato inválido é descartado, a URL é limpa e qualquer valor anterior da mesma sessão é removido.

## Evidência do recebimento no PWA

- Data: 2026-07-21 13:12:21 (`America/Sao_Paulo`).
- Formato aceito: 64 caracteres hexadecimais minúsculos.
- URL com token de teste: parâmetro removido e demais query params e fragmento preservados.
- Recarga na mesma aba: token restaurado a partir de `sessionStorage`.
- Link inválido: valor descartado, sessão limpa e mensagem pública sem dados sensíveis.
- Navegador em 430 px: a interface foi validada com resposta interceptada, zero erros de console e zero requisições externas.
- Nenhum endpoint real ou dado persistente foi acessado nessa validação isolada.

## Evidência da configuração do modo API

- Data: 2026-07-21 13:35:39 (`America/Sao_Paulo`).
- Base pública configurada: `https://n8n.autamacao.shop/api`.
- Sem token na sessão: nenhuma requisição foi iniciada e a interface solicitou abertura pelo link de acesso.
- Com token de teste: o navegador montou `Authorization: Bearer` somente em tempo de execução e chamou `GET /api/accounts`.
- A requisição simulada não enviou cookies nem `Referer` e usou `cache: no-store`.
- A renderização escapou HTML recebido na resposta, protegendo o token em memória contra injeção por campos textuais.
- O teste usou somente resposta interceptada; nenhum endpoint real ou dado persistente foi acessado nesta tarefa.

## Evidência em produção

- Data: 2026-07-21 15:08:27 (`America/Sao_Paulo`).
- O token final foi lido diretamente do ambiente do n8n para a memória do teste e nunca foi exibido, salvo ou registrado.
- O magic link de produção removeu o parâmetro da URL antes da interação com a interface.
- GET e os três POSTs enviaram Bearer válido sem cookies ou `Referer` e receberam `200` com CORS restrito à origem Vercel.
- Nenhuma execução dos quatro workflows foi armazenada após os testes.

## Rotação programada ou por suspeita de exposição

1. Gerar no servidor um novo valor com fonte criptograficamente segura, por exemplo `openssl rand -hex 32`.
2. Substituir `FINANCAS_PWA_TOKEN` na configuração persistente do serviço n8n no EasyPanel.
3. Implantar novamente somente o serviço n8n para propagar a variável ao novo container.
4. Confirmar sem imprimir o valor:
   - existência da variável;
   - comprimento de 64 caracteres;
   - igualdade entre EasyPanel, especificação do Swarm e container em execução.
5. Confirmar que o novo token recebe a resposta esperada e que um token inválido recebe `401 UNAUTHORIZED`. Em rotação futura, confirmar também que o valor anterior foi revogado.
6. Emitir um novo magic link e invalidar qualquer link anterior.
7. Registrar data, responsável e resultado da verificação, sem registrar token ou hash.

Se alguma verificação falhar, restaurar a configuração operacional anterior somente quando não houver suspeita de comprometimento. Em caso de suspeita, gerar outro token novo; nunca reativar o valor comprometido.

## Revogação imediata

Para revogar todo acesso atual, substituir o valor por outro token aleatório não distribuído e reimplantar o serviço n8n. Depois da convergência, qualquer cliente com o valor anterior deverá receber `401 UNAUTHORIZED`. Um novo token só será distribuído quando o acesso puder ser restabelecido com segurança.

## Evidências permitidas

Podem ser registradas somente evidências não sensíveis: data e hora, ambiente, comprimento esperado, resultado booleano das comparações, estado do serviço e códigos HTTP. O valor do token, fragmentos, hashes usados como credencial ou comandos que o contenham ficam proibidos.
