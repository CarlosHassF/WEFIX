# WeFix — Ordens de serviço com rastreio de status e métricas

Data: 2026-10-22
Status: aprovado pelo usuário (2026-10-22)

## 1. Intenção

O WeFix é o sistema de uma assistência técnica de dispositivos de TI. Cada atendimento vira uma **ficha** (ordem de serviço) que passa por um fluxo fixo de status. O supervisor (admin) precisa medir a qualidade do trabalho:

- quantas fichas foram concluídas por dia;
- quanto tempo cada ficha ficou em cada status;
- o tempo total desde a abertura até a conclusão;
- quais etapas estouraram o prazo (SLA) definido para elas.

O cliente participa por WhatsApp, através de um fluxo no **n8n**. Ele aprova ou recusa o orçamento e é avisado quando o aparelho está pronto para retirada.

Este documento define o modelo de banco final (Prisma + PostgreSQL) e a API REST (Express) que substitui a API atual de fichas e usuários.

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- Modelar cliente, dispositivo, ficha, histórico de etapas (eventos) e prazos por status.
- Garantir pela API que a ficha só faz as transições permitidas, e só pelo cargo certo.
- Registrar cada passagem por status com quem moveu, quando entrou, quando saiu e o prazo dela.
- Expor endpoints de métricas, por técnico e gerais, com filtro de período.
- Integrar com o n8n: a API dispara webhooks e o n8n chama a API com uma chave própria.
- Corrigir os problemas atuais de autorização e os bugs de controllers e repositories.

**Não-objetivos (fora deste trabalho)**
- Frontend (a pasta `frontend/` não é tocada).
- O fluxo do n8n em si (mensagens, templates de WhatsApp). A API só dispara e recebe.
- Pagamento, emissão de nota e estoque de peças.
- Fotos ou anexos da ficha.
- Contagem de prazo em horário comercial. Os prazos são em horas corridas.
- Reatribuir técnico, ou destravar fichas de um técnico desativado (decisão do usuário: fase de MVP). Limitação conhecida: se o técnico responsável for desativado, as fichas dele em `em_analise`, `em_manutencao` ou `em_aprovacao` reprovada ficam paradas.
- Preservar os dados do banco atual. É banco de desenvolvimento: as migrations antigas são substituídas e o banco é recriado com `prisma migrate reset`.

**Anti-objetivos (seria falha mesmo funcionando)**
- Qualquer caminho que mude o status sem passar pela tabela de transições, ou sem gravar o evento. Isso estraga as métricas.
- Apagar fichas ou usuários. O histórico tem que ser imutável para as métricas do passado não mudarem.
- Um usuário sem login conseguir criar usuários (problema que existe hoje no `POST /usuarios`).

## 3. Restrições

- Stack existente: Node (ESM, JavaScript, sem TypeScript no backend), Express 5, Prisma 7 com `@prisma/adapter-pg`, JWT (`jsonwebtoken`) e `bcrypt`.
- Schema dividido em vários arquivos em `models/` (`prisma.config.ts` aponta `schema: 'models'`, migrations em `database/migrations`).
- Estrutura em camadas: `routes/` → `controllers/` → `repository/`, com middlewares em `middlewares/`. Manter nomes e idioma em português e snake_case nos campos, como no código atual.
- IDs `BigInt` com `autoincrement`. As respostas serializam BigInt como string (já feito em `server.js`). **Toda FK que aponta para um id BigInt também precisa ser BigInt.** O rascunho atual usa `Int` em `ficha_id`, `evento_id` e `id_usuario`, o que é inválido.
- Todo model tem `created_at` e `updated_at` (decisão já tomada pelo usuário):
  ```prisma
  created_at DateTime @default(now()) @db.Timestamptz(6)
  updated_at DateTime @default(now()) @updatedAt @db.Timestamptz(6)
  ```

## 4. Fluxo da ficha (decidido)

| Status | Significado | Quem leva a ficha para este status |
|---|---|---|
| `aberta` | Criada pelo atendente | atendente, admin (na criação) |
| `em_analise` | Técnico assumiu e está diagnosticando | técnico (a partir de `aberta`). Ele vira o técnico responsável |
| `em_espera` | Diagnóstico e valor informados; aguardando o cliente aprovar o orçamento | técnico responsável (a partir de `em_analise`). Exige `diagnostico` e `valor_servico` |
| `em_manutencao` | Cliente aprovou o valor; conserto em andamento | **n8n** (cliente aprovou no WhatsApp), a partir de `em_espera`; **admin**, a partir de `em_espera` (aprovação manual: o cliente aprovou por telefone ou o n8n está fora; `observacao` obrigatória); **admin**, a partir de `em_aprovacao` (reprovou o serviço) |
| `em_aprovacao` | Serviço pronto; admin revisa | técnico responsável (a partir de `em_manutencao`) |
| `consertado` (final) | Admin aprovou o serviço; cliente avisado para retirar | admin (a partir de `em_aprovacao`) |
| `cancelado` (final) | Cliente desistiu ou recusou o orçamento | n8n (recusa, a partir de `em_espera`); atendente ou admin (a partir de `aberta`, `em_analise` ou `em_espera`) |

Regras:
- **O cancelamento só é possível antes da manutenção** (`aberta`, `em_analise`, `em_espera`).
- A reprovação do admin (`em_aprovacao` → `em_manutencao`) exige `observacao` com o motivo. A ficha pode repetir esse ciclo várias vezes.
- Status finais não mudam mais.
- Webhooks para o n8n:
  - ao entrar em `em_espera`, evento `orcamento` (com diagnóstico e valor);
  - ao entrar em `consertado`, evento `retirada`.

A tabela de transições permitidas `(de, para) → cargos/origem permitidos + campos exigidos` fica num único módulo (`services/transicoes.js` ou equivalente). Rotas e controllers não repetem essas regras.

## 5. Modelo de dados

O modelo de dados segue o rascunho do usuário (`Ficha` → `Evento` com prazo e `expirado`), com uma simplificação: **`Evento` e `Status` viram uma tabela só.** Cada registro de `Evento` é uma passagem da ficha por um status. Assim o tempo em cada etapa é `saiu_em - entrou_em` e não precisa de join.

### Enums

```prisma
enum Cargos { atendente admin tecnico }

enum StatusFicha {
  aberta
  em_analise
  em_espera
  em_manutencao
  em_aprovacao
  consertado
  cancelado
}

enum TipoDispositivo { notebook desktop celular tablet impressora outro }

enum OrigemEvento { usuario n8n }
```

### Models (campos essenciais; tamanhos de VarChar ficam com quem implementa)

**Usuario**: `id_usuario`, `nome_usuario`, `email_usuario` (unique), `senha_usuario` (hash bcrypt), `cargo_usuario Cargos`, `ativo Boolean @default(true)`, timestamps. Relações: fichas abertas (como atendente), fichas assumidas (como técnico) e eventos realizados. São duas relações nomeadas com `Ficha`.

**Cliente**: `id_cliente`, `nome_cliente`, `whatsapp_cliente` (unique; número só com dígitos, com DDI e DDD, ex.: `5511999999999`, que é o formato que o n8n usa), `email_cliente?`, timestamps. Relações: dispositivos, fichas.

**Dispositivo**: `id_dispositivo`, `id_cliente` (FK), `tipo TipoDispositivo`, `marca`, `modelo`, `numero_serie?` (série ou IMEI, com index não-único), timestamps. Relações: fichas.

**Ficha**:
- `id_manutencao` (mantém o nome atual)
- `id_cliente` (FK; o dono do aparelho na época do atendimento, para onde o n8n manda as mensagens)
- `id_dispositivo` (FK)
- `id_atendente` (FK Usuario, obrigatório: quem abriu)
- `id_tecnico?` (FK Usuario: preenchido quando o técnico assume)
- `defeito_relatado` (obrigatório na abertura)
- `acessorios?`, `estado_entrada?`, `senha_dispositivo?` (dados da entrada do aparelho; ficam na ficha porque mudam a cada visita)
- `diagnostico?`, `valor_servico Decimal(10,2)?` (preenchidos pelo técnico; obrigatórios para ir a `em_espera`; **sem o default 50 atual**)
- `observacao?`
- `status StatusFicha @default(aberta)` (status atual, desnormalizado para listar e filtrar rápido)
- `finalizada_em DateTime?` (preenchido ao entrar em `consertado`/`cancelado`)
- timestamps

**Evento** (uma passagem por status):
- `id_evento`
- `id_manutencao` (FK Ficha)
- `status StatusFicha`
- `origem OrigemEvento`
- `id_usuario?` (FK Usuario: quem levou a ficha para este status; nulo quando a origem é `n8n`)
- `observacao?` (ex.: motivo da reprovação)
- `entrou_em DateTime @default(now())`
- `saiu_em DateTime?` (nulo = etapa atual)
- `prazo_limite DateTime?` (`entrou_em + PrazoStatus.prazo_horas` no momento da entrada; nulo se não houver prazo para o status, por exemplo nos finais)
- `expirado Boolean @default(false)` (gravado ao fechar o evento: `saiu_em > prazo_limite`. Para a etapa atual, a API calcula ao vivo: `now() > prazo_limite`)
- timestamps
- índices em `(id_manutencao, entrou_em)` e `(status, entrou_em)`

**PrazoStatus** (SLA editável pelo admin):
- `status StatusFicha @id`
- `prazo_horas Int` (horas corridas)
- timestamps
- Um seed cria uma linha para cada status não-final com valores iniciais (sugestão: `aberta` 4h, `em_analise` 24h, `em_espera` 48h, `em_manutencao` 72h, `em_aprovacao` 8h). O admin ajusta depois.
- Mudar um prazo **não altera eventos antigos**, porque `prazo_limite` fica gravado em cada evento.

### Arquivos
Um arquivo por domínio em `models/`: `usuario.model.prisma`, `cliente.model.prisma`, `dispositivo.model.prisma`, `ficha.model.prisma`, `evento.model.prisma`, `prazo.model.prisma`. O `status.model.prisma` deixa de existir como model, e o enum `StatusFicha` vai para `ficha.model.prisma`.

## 6. Mudança de status (núcleo)

Uma única função de serviço, `mudarStatus(id_manutencao, para, ator, dados)`, onde `ator = { tipo: 'usuario', id, cargo } | { tipo: 'n8n' }`. Ela faz:

1. Carrega a ficha e procura `(status_atual, para)` na tabela de transições. Se não estiver lá: **409**.
2. Verifica o cargo e a origem. Também verifica se o técnico é o responsável, quando a regra pedir. Se falhar: **403**.
3. Valida os campos exigidos, como `diagnostico`/`valor_servico` para `em_espera` e `observacao` na reprovação. Se faltar: **400**.
4. Dentro de `prisma.$transaction`:
   - atualiza a ficha com `updateMany where { id_manutencao, status: status_atual }`. Se 0 linhas forem afetadas, outra requisição mudou a ficha antes: **409**;
   - grava `id_tecnico` ao entrar em `em_analise`, e `finalizada_em` ao entrar num status final;
   - fecha o evento aberto (`saiu_em = now()` e calcula `expirado`);
   - cria o novo evento com `prazo_limite` vindo de `PrazoStatus`.
5. Depois do commit, dispara o webhook do n8n se o novo status pedir. **Se o webhook falhar, a transição não é desfeita.** O erro vai para o log. A ficha já está no status novo, e reenviar o webhook fica para depois (ver §11).

A criação da ficha também grava o primeiro evento (`aberta`) na mesma transação.

## 7. API REST

Respostas sempre em JSON. Sucesso: o recurso, ou `{ mensagem }`. Erro: `{ erro }`. Todas as rotas, menos `/auth/login` e `/integracoes/n8n/*`, exigem JWT.

**Auth**
- `POST /auth/login`: como hoje. Bloqueia usuário com `ativo = false`.

**Usuários** (admin)
- `GET /usuarios`: sem o hash da senha.
- `POST /usuarios`: **passa a exigir admin.** O primeiro admin é criado por um script de seed (`prisma/seed` ou `scripts/cria-admin.js`) que lê e-mail e senha do `.env`.
- `PUT /usuarios/:id_usuario`: senha opcional (gera novo hash só se vier).
- `PATCH /usuarios/:id_usuario/ativo` `{ ativo }`: desativar e reativar. **Não existe DELETE.**

**Clientes** (atendente, admin; técnico só lê)
- `GET /clientes?busca=`: busca por nome ou WhatsApp.
- `GET /clientes/:id_cliente`: com dispositivos e fichas.
- `POST /clientes`, `PUT /clientes/:id_cliente`

**Dispositivos** (atendente, admin; técnico só lê)
- `GET /clientes/:id_cliente/dispositivos`
- `POST /clientes/:id_cliente/dispositivos`
- `PUT /dispositivos/:id_dispositivo`

**Fichas**
- `GET /fichas?status=&id_tecnico=&id_cliente=&expirada=`: todos os cargos. Cada ficha vem com `etapa_atual { status, entrou_em, prazo_limite, expirado }`.
- `GET /fichas/:id_manutencao`: com cliente, dispositivo, atendente, técnico e o histórico de eventos.
- `POST /fichas` (atendente, admin): recebe `id_cliente`, `id_dispositivo`, `defeito_relatado` e os campos de entrada. O dispositivo precisa pertencer ao cliente.
- `PUT /fichas/:id_manutencao`: edita dados, **nunca o status**. Atendente e admin editam os dados de entrada enquanto a ficha não estiver finalizada. O técnico responsável edita `diagnostico`/`valor_servico` enquanto a ficha está `em_analise`.
- `PATCH /fichas/:id_manutencao/status` `{ status, observacao?, diagnostico?, valor_servico? }`: único caminho de transição para usuários (§6).
- **Não existe DELETE.**

**Prazos** (admin)
- `GET /prazos`, `PUT /prazos/:status` `{ prazo_horas }`

**Métricas** (admin). Todas aceitam `de`, `ate` (datas) e `id_tecnico` opcional. "Dia" é contado no fuso `America/Sao_Paulo`.
- `GET /metricas/concluidas-por-dia`: `[{ dia, consertadas, canceladas }]`, total e por técnico.
- `GET /metricas/tempo-por-status`: média, mediana e máximo de horas por status, somando todas as passagens da mesma ficha pelo mesmo status (reprovações). Considera só eventos fechados.
- `GET /metricas/tempo-total`: média e mediana de horas de `created_at` até `finalizada_em` para fichas `consertado`, total e por técnico.
- `GET /metricas/prazos`: quantidade e percentual de eventos expirados por status e por técnico, mais a lista das fichas com a etapa atual estourada.
- Implementação livre: `$queryRaw` com SQL agregando `Evento`/`Ficha` é aceitável.

**Integração n8n** (sem JWT; header `x-api-key` comparado com `N8N_API_KEY`)
- `POST /integracoes/n8n/fichas/:id_manutencao/orcamento` `{ aprovado: boolean }`: aprovado leva a `em_manutencao`; recusado leva a `cancelado`. Passa por `mudarStatus` com ator `n8n`.
- Saída: `POST` em `N8N_WEBHOOK_URL` com `{ evento: 'orcamento' | 'retirada', id_manutencao, cliente: { nome, whatsapp }, dispositivo: { tipo, marca, modelo }, diagnostico, valor_servico }`.

## 8. Middlewares

- `validaToken`: mantém. Passa a retornar JSON em todos os erros.
- `validaCargo(...cargos)`: **corrigir para rest params.** Hoje recebe um array, mas é chamado com vários argumentos, e isso barra o técnico. 401 para quem não está autenticado e 403 para cargo sem permissão.
- `validaApiKeyN8n`: novo, para `/integracoes/n8n`.
- Handler central de erros no `server.js`: Express 5 já repassa os erros de handlers async. Os controllers deixam de repetir `try/catch` com 500 genérico e lançam erros com status (ex.: classe `ErroHttp`).

## 9. Correções do código atual (precisam sair junto)

- Repositories usam `prisma.fichas`/`prisma.usuarios`. Passa a ser `prisma.ficha`/`prisma.usuario`, conforme os novos models.
- `editaUsuario`: `senha_usuario` está declarado dentro do `if`, o que causa ReferenceError.
- `auth.controller`: o `catch` faz `console.log(token)` com uma variável que não existe nesse escopo.
- `usuarios.controller`: o `catch` usa `require` dentro de ESM.
- `database/connection.js` lê `DB_URL`, mas `.env.example` define `DATABASE_URL`. Unificar em `DATABASE_URL`.
- O generator de `models/schema.prisma` (`prisma-client-js`) e o import `pkg from '@prisma/client'` precisam continuar compatíveis. Escolher um padrão e remover `prisma/schema.prisma` e `prisma7.config.ts` se estiverem obsoletos, porque hoje o CLI sem `--config` carrega o config errado.
- Remover os `import { stat }` não usados.
- `.env.example`: adicionar `N8N_API_KEY`, `N8N_WEBHOOK_URL`, `ADMIN_EMAIL`, `ADMIN_SENHA`.

## 10. Testes

Hoje não existe nenhum. **Decisão minha:** usar o `node:test` nativo (sem dependências novas) para:
- a tabela de transições: cada par permitido e uma amostra de pares proibidos, por cargo e origem;
- `mudarStatus` contra um banco de teste: grava e fecha eventos, calcula `expirado`, devolve 409 quando há concorrência;
- uma consulta de métrica com dados conhecidos.

Os testes que usam banco leem `TEST_DATABASE_URL` (um banco Postgres local separado, recriado com `prisma migrate reset` antes da suíte). Script: `pnpm test` → `node --test`.

## 10.1 Migração do banco

O banco atual é só de desenvolvimento. A migration `20261008182236_init` e o `example.migration.ts` são removidos. Depois roda `prisma migrate reset` e é gerada uma migration nova do schema completo, seguida do seed (admin inicial + `PrazoStatus`).

## 11. Decisões deixadas para quem implementa

**Regra (do usuário):** toda decisão desta seção tomada durante a implementação deve ficar marcada no código, no ponto onde foi aplicada, com um comentário que diga o que precisa ser decidido. Assim o usuário encontra e revisa depois com `grep -rn "DECISAO:"`. Formato:

```js
// DECISAO: <o que precisa ser decidido> — escolhido: <o que foi feito>; alternativas: <outras opções>
```

- Tamanhos de VarChar, nomes exatos de arquivos de serviço e o formato da classe de erro.
- Validação de payload: manual (como hoje) ou com uma biblioteca leve.
- Reenvio de webhook que falhou: pode ficar só no log nesta versão.
- Paginação nas listagens: recomendada (`?pagina=&limite=`), mas o formato fica livre.

## 12. Decisões que tomei e precisam de conferência

- O rascunho `Evento` + `Status` foi fundido numa só tabela `Evento` (uma linha por passagem de status).
- `id_cliente` fica na ficha, além de ficar no dispositivo.
- `senha_dispositivo` é gravada em texto puro, porque o técnico precisa ler. Quem tiver acesso ao banco consegue ler.
- Técnico vê todas as fichas, não só as dele.
- Prazos em horas corridas, com os valores iniciais da §5.
