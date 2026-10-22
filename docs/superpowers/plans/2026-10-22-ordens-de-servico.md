# Ordens de serviço com rastreio de status — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever o banco (Prisma/Postgres) e a API REST do WeFix para fichas com fluxo de status controlado, histórico de etapas com prazo (SLA), integração com o n8n e métricas para o supervisor.

**Architecture:** O Express continua em camadas: `routes` → `controllers` → `services`/`repository`. Toda mudança de status passa por uma função única (`mudarStatus`), que consulta uma tabela de transições pura e grava ficha e evento numa transação. As métricas são SQL agregado (`$queryRaw`) sobre `Evento`/`Ficha`. O `server.js` passa a só subir o `app.js`, para que os testes consigam montar a API numa porta efêmera.

**Tech Stack:** Node 22 (ESM, JS), Express 5, Prisma 7 + `@prisma/adapter-pg`, PostgreSQL, `jsonwebtoken`, `bcrypt`, `node:test` + `fetch` nativo (sem dependências novas).

**Spec:** `docs/superpowers/specs/2026-10-22-ordens-de-servico-design.md`. Leia a spec inteira antes de começar. Este plano não repete as tabelas de fluxo e de campos de lá.

## Global Constraints

- Nada é apagado: não existe DELETE de ficha nem de usuário. Usuário tem `ativo`.
- Toda mudança de status passa por `mudarStatus` e grava `Evento`. Nenhum repository faz `update` de `status` por fora.
- IDs são `BigInt` e toda FK para eles também é `BigInt`. Ids vindos de URL/body são convertidos com `paraBigInt` (400 se inválido).
- Todo model tem `created_at DateTime @default(now()) @db.Timestamptz(6)` e `updated_at DateTime @default(now()) @updatedAt @db.Timestamptz(6)`.
- Respostas em JSON. Sucesso: o recurso, ou `{ mensagem }`. Erro: `{ erro }`.
- Nomes em português e campos em snake_case, como no código atual. Prettier: sem ponto e vírgula, aspas simples, `trailingComma: 'es5'`.
- "Dia" nas métricas = fuso `America/Sao_Paulo`. Prazos em horas corridas.
- Webhook do n8n que falha **não** desfaz a transição. O erro só vai para o log.
- Toda decisão deixada para quem implementa (spec §11, ou marcada como livre neste plano) leva o comentário `// DECISAO: <o que decidir> — escolhido: <...>; alternativas: <...>` no ponto do código onde foi aplicada.
- Variáveis de ambiente: `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, `N8N_API_KEY`, `N8N_WEBHOOK_URL`, `ADMIN_EMAIL`, `ADMIN_SENHA`.

## Review Focus

1. Duas requisições mudando o status da mesma ficha ao mesmo tempo: exatamente uma vence e a outra recebe 409. Nunca podem ficar dois eventos abertos.
2. Id inválido na URL (`/fichas/abc`, `/usuarios/1.5`) deve dar 400 `{ erro }`, nunca 500.
3. Usuário desativado com um JWT ainda válido deve ser barrado (401) já na próxima requisição, e não só no próximo login.
4. `valor_servico` negativo, não numérico ou com mais de 2 casas decimais deve dar 400 ao ir para `em_espera` e no `PUT`.
5. O filtro de período das métricas inclui o dia `ate` inteiro no fuso de São Paulo. Uma ficha finalizada às 23:30 (SP) do dia `ate` conta, mesmo já sendo o dia seguinte em UTC.

---

## Estrutura de arquivos

```
app.js                         (novo) monta express, rotas e trataErros; export default app
server.js                      (mod)  só importa app e escuta na 3000
database/connection.js         (mod)  DATABASE_URL
database/seed.js               (novo) semearPrazos, semearAdmin + execução CLI
models/*.model.prisma          (reescritos) usuario, cliente, dispositivo, ficha, evento, prazo
utils/erroHttp.js              (novo) ErroHttp, paraBigInt
utils/validacao.js             (novo) validadores de payload compartilhados
services/transicoes.js         (novo) tabela pura + validarTransicao
services/fichaStatus.service.js(novo) criarFicha, mudarStatus
services/n8n.service.js        (novo) notificar
repository/{usuarios,clientes,dispositivos,fichas,prazos,metricas}.repository.js
controllers/{auth,usuarios,clientes,dispositivos,fichas,prazos,metricas,integracoes}.controller.js
routes/{auth,usuarios,clientes,dispositivos,fichas,prazos,metricas,integracoes}.routes.js
middlewares/{auth,validaCargo,validaApiKeyN8n,trataErros}.middleware.js
tests/helpers/{env,db,app}.js
tests/*.test.js
```

Remover: `prisma/schema.prisma`, `prisma7.config.ts`, `models/status.model.prisma`, `database/migrations/20261008182236_init/`, `database/migrations/example.migration.ts`.

---

### Task 1: Schema, migration nova, seed e infraestrutura de teste

**Files:**

- Rewrite: `models/usuario.model.prisma`, `models/ficha.model.prisma`, `models/evento.model.prisma`, `models/dispositivo.model.prisma`
- Create: `models/cliente.model.prisma`, `models/prazo.model.prisma`, `database/seed.js`, `tests/helpers/env.js`, `tests/helpers/db.js`, `tests/seed.test.js`
- Modify: `models/schema.prisma`, `prisma.config.ts`, `database/connection.js`, `package.json`, `.env.example`
- Delete: os arquivos da lista "Remover" acima

**Interfaces:**

- Produces:
  - models Prisma `Usuario`, `Cliente`, `Dispositivo`, `Ficha`, `Evento`, `PrazoStatus` e enums `Cargos`, `StatusFicha`, `TipoDispositivo`, `OrigemEvento`, exatamente como a spec §5. Delegates do client: `prisma.usuario`, `prisma.cliente`, `prisma.dispositivo`, `prisma.ficha`, `prisma.evento`, `prisma.prazoStatus`.
  - Relações nomeadas em `Ficha`: `atendente` (`@relation("FichaAtendente")`, campo `id_atendente`) e `tecnico` (`@relation("FichaTecnico")`, campo `id_tecnico`). `Ficha.eventos`, `Evento.ficha`, `Evento.usuario`.
  - `database/seed.js`: `export const PRAZOS_INICIAIS = { aberta: 4, em_analise: 24, em_espera: 48, em_manutencao: 72, em_aprovacao: 8 }`, `export async function semearPrazos(prisma): Promise<void>` (upsert, não sobrescreve valor existente), `export async function semearAdmin(prisma, email, senha): Promise<Usuario>` (upsert por email, cargo admin, senha com hash bcrypt de custo 10). Quando executado direto (`node database/seed.js`), roda os dois com `ADMIN_EMAIL`/`ADMIN_SENHA`.
  - `tests/helpers/env.js`: importado **primeiro** em todo teste. Copia `TEST_DATABASE_URL` para `DATABASE_URL` e lança erro se não existir. Também define `JWT_SECRET='teste'` e `N8N_API_KEY='chave-teste'` se ausentes.
  - `tests/helpers/db.js`: `export async function limparBanco(): Promise<void>` (`TRUNCATE "Evento","Ficha","Dispositivo","Cliente","Usuario","PrazoStatus" RESTART IDENTITY CASCADE`, depois `semearPrazos`), `export async function criaUsuarioTeste({ cargo, ativo = true, email? }): Promise<{ usuario, token }>` (token JWT com o mesmo payload do login).

- [ ] **Step 1: Limpar a configuração antiga.** Apague os arquivos de "Remover". Em `models/schema.prisma` mantenha `prisma-client-js` (é o que `database/connection.js` importa hoje) e adicione acima do generator: `// DECISAO: generator do client — escolhido: prisma-client-js importado de '@prisma/client'; alternativas: prisma-client com output em generated/`. Em `prisma.config.ts` adicione `seed: 'node database/seed.js'` dentro de `migrations`.

- [ ] **Step 2: Escrever os models** conforme a spec §5. Índices de `Evento`: `@@index([id_manutencao, entrou_em])` e `@@index([status, entrou_em])`. Índice em `Dispositivo.numero_serie`. `Cliente.whatsapp_cliente @unique`. `PrazoStatus.status StatusFicha @id`, `prazo_horas Int`. Para os tamanhos de VarChar, siga o padrão `// DECISAO:` uma vez no topo de cada arquivo.

- [ ] **Step 3: Validar o schema**
      Run: `pnpm prisma validate && pnpm prisma format`
      Expected: `The schemas at models are valid`

- [ ] **Step 4: `database/connection.js`** passa a ler `process.env.DATABASE_URL`. Remova o bloco comentado antigo do `pg`. `.env.example` ganha `TEST_DATABASE_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_URL`, `ADMIN_EMAIL`, `ADMIN_SENHA` e perde `DB_USER`/`DB_PASS`/`DB_HOST`/`DB_PORT`/`DB_BANCO`.

- [ ] **Step 5: Gerar a migration nova e o client**
      Run: `pnpm prisma migrate reset --force && pnpm prisma migrate dev --name schema_ordens_servico && pnpm prisma db seed`
      Expected: pasta nova em `database/migrations/` e o seed sem erro. Depois do Step 6, rode `pnpm test:db` para preparar o banco de teste.

- [ ] **Step 6: Banco de teste pelo CLI.** Em `prisma.config.ts`, `datasource.url` vira `process.env.PRISMA_ALVO === 'teste' ? env('TEST_DATABASE_URL') : env('DATABASE_URL')`. Scripts no `package.json`: `"test": "node --test --test-concurrency=1 tests/"`, `"test:db": "PRISMA_ALVO=teste prisma migrate reset --force"`, `"db:seed": "prisma db seed"`.

- [ ] **Step 7: Escrever o teste do seed** em `tests/seed.test.js`:

```js
import './helpers/env.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../database/connection.js'
import { limparBanco } from './helpers/db.js'
import { semearAdmin, PRAZOS_INICIAIS } from '../database/seed.js'

before(limparBanco)
after(() => prisma.$disconnect())

test('limparBanco deixa um prazo por status não-final', async () => {
  const prazos = await prisma.prazoStatus.findMany()
  assert.equal(prazos.length, 5)
  assert.equal(
    prazos.find((p) => p.status === 'em_manutencao').prazo_horas,
    PRAZOS_INICIAIS.em_manutencao
  )
})

test('semearAdmin é idempotente e grava hash', async () => {
  await semearAdmin(prisma, 'adm@wefix.test', 'segredo')
  const u = await semearAdmin(prisma, 'adm@wefix.test', 'segredo')
  assert.equal(u.cargo_usuario, 'admin')
  assert.notEqual(u.senha_usuario, 'segredo')
  assert.equal(await prisma.usuario.count(), 1)
})
```

- [ ] **Step 8: Rodar.**
      Run: `pnpm test`
      Expected: os 2 testes PASS. Se falharem, corrija seed ou helpers até passarem.

- [ ] **Step 9: Commit**

```bash
git add -A models prisma prisma7.config.ts prisma.config.ts database package.json .env.example tests docs/superpowers
git commit -m "feat(db): novo schema de ordens de servico, seed e infraestrutura de testes"
```

---

### Task 2: Tabela de transições (pura) e erros HTTP

**Files:**

- Create: `utils/erroHttp.js`, `services/transicoes.js`, `tests/transicoes.test.js`

**Interfaces:**

- Produces:
  - `utils/erroHttp.js`: `export class ErroHttp extends Error { constructor(status: number, mensagem: string) }` com `this.status`. `export function paraBigInt(valor, nome = 'id'): bigint` aceita só `/^\d+$/` (string ou number inteiro ≥ 1); caso contrário, `throw new ErroHttp(400, \`${nome} inválido\`)`.
  - `services/transicoes.js`:
    - `export const STATUS_FINAIS = ['consertado', 'cancelado']`
    - `export const WEBHOOK_POR_STATUS = { em_espera: 'orcamento', consertado: 'retirada' }`
    - `export const TRANSICOES`: array de regras `{ de, para, ator, exige }`, onde `ator` é `'n8n'` ou `{ cargos: string[], somenteResponsavel?: boolean }` e `exige` é uma lista de campos, cada um vindo de `dados` ou já presente na ficha. Uma linha por combinação da spec §4:

      | de                            | para          | ator                                            | exige                      |
      | ----------------------------- | ------------- | ----------------------------------------------- | -------------------------- |
      | aberta                        | em_analise    | `{cargos:['tecnico']}`                          | –                          |
      | em_analise                    | em_espera     | `{cargos:['tecnico'], somenteResponsavel:true}` | diagnostico, valor_servico |
      | em_espera                     | em_manutencao | `'n8n'`                                         | –                          |
      | em_espera                     | em_manutencao | `{cargos:['admin']}`                            | observacao                 |
      | em_manutencao                 | em_aprovacao  | `{cargos:['tecnico'], somenteResponsavel:true}` | –                          |
      | em_aprovacao                  | em_manutencao | `{cargos:['admin']}`                            | observacao                 |
      | em_aprovacao                  | consertado    | `{cargos:['admin']}`                            | –                          |
      | aberta, em_analise, em_espera | cancelado     | `{cargos:['atendente','admin']}`                | –                          |
      | em_espera                     | cancelado     | `'n8n'`                                         | –                          |

    - `export function validarTransicao({ ficha, para, ator, dados = {} }): void`, onde `ator` é `{ tipo: 'usuario', id: bigint, cargo }` ou `{ tipo: 'n8n' }`. A ordem dos erros é fixa:
      1. nenhuma regra com `(ficha.status, para)` → 409 `Transição de <de> para <para> não permitida`;
      2. nenhuma regra dessas aceita o ator, ou `somenteResponsavel` com `ficha.id_tecnico !== ator.id` → 403;
      3. campo de `exige` ausente ou vazio → 400 `<campo> é obrigatório`.
         Não valida o formato do valor; isso é a Task 3.

- [ ] **Step 1: Escrever os testes** em `tests/transicoes.test.js` (sem banco, sem `env.js`). Use `ficha = { status, id_tecnico: 7n, diagnostico: null, valor_servico: null }`, `tec = { tipo:'usuario', id:7n, cargo:'tecnico' }`, `outroTec = {...tec, id: 8n}`, `admin`, `atendente`, `n8n = { tipo:'n8n' }`. Casos, com `assert.throws(fn, { status: N })` ou `assert.doesNotThrow`:
  - `aberta→em_analise` tec ok; atendente 403
  - `em_analise→em_espera` tec com `{diagnostico:'tela', valor_servico:'150.00'}` ok; sem valor 400; `outroTec` 403
  - `em_espera→em_manutencao` n8n ok; admin sem observacao 400; admin com observacao ok; tec 403
  - `em_aprovacao→em_manutencao` admin sem observacao 400
  - `em_manutencao→cancelado` admin 409 (cancelar só antes da manutenção)
  - `consertado→em_manutencao` admin 409
  - `em_espera→cancelado` n8n ok; atendente ok
  - `paraBigInt('12')===12n`; `paraBigInt('abc')`, `paraBigInt('1.5')`, `paraBigInt('0')` → 400

- [ ] **Step 2:** Run `node --test tests/transicoes.test.js`. Expected: FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar `utils/erroHttp.js` e `services/transicoes.js` com as interfaces acima.
- [ ] **Step 4:** Run `node --test tests/transicoes.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(fichas): tabela de transicoes de status`

---

### Task 3: `criarFicha` e `mudarStatus` (transação + eventos)

**Files:**

- Create: `services/fichaStatus.service.js`, `utils/validacao.js`, `services/n8n.service.js` (stub nesta task), `tests/fichaStatus.test.js`

**Interfaces:**

- Consumes: `validarTransicao`, `STATUS_FINAIS`, `WEBHOOK_POR_STATUS`, `ErroHttp` (Task 2); delegates Prisma (Task 1); `limparBanco`, `criaUsuarioTeste` (Task 1).
- Produces:
  - `utils/validacao.js`: `export function validaValor(valor): string`. Aceita number ou string com até 2 casas, ≥ 0, e devolve uma string normalizada (`'150.00'`); caso contrário, `ErroHttp(400, 'valor_servico inválido')`. `export function validaTexto(valor, campo, max): string|undefined`, que faz trim, devolve `undefined` se ausente e dá 400 se passar de `max`.
  - `services/n8n.service.js`: `export async function notificar(evento, id_manutencao): Promise<void>`. Nesta task, só `console.log`; a Task 8 implementa.
  - `services/fichaStatus.service.js`:
    - `export async function criarFicha(dados, id_atendente: bigint): Promise<Ficha>`. `dados = { id_cliente: bigint, id_dispositivo: bigint, defeito_relatado, acessorios?, estado_entrada?, senha_dispositivo?, observacao? }`. Faz 400 se o dispositivo não existe ou não pertence ao cliente. Na mesma transação, cria a ficha (`status: 'aberta'`) e o evento `aberta` (`origem:'usuario'`, `id_usuario: id_atendente`, `prazo_limite` vindo do `PrazoStatus`).
    - `export async function mudarStatus(id_manutencao: bigint, para, ator, dados = {}): Promise<Ficha>`. Segue o algoritmo da spec §6. Detalhes fixados aqui:
      - ficha inexistente → 404 `Ficha não encontrada`;
      - `dados.valor_servico` passa por `validaValor` antes do `validarTransicao`;
      - campos gravados na ficha junto com a transição: `diagnostico`, `valor_servico` (quando vierem); `id_tecnico = ator.id` ao entrar em `em_analise`; `finalizada_em = agora` ao entrar em `STATUS_FINAIS`;
      - concorrência: `tx.ficha.updateMany({ where: { id_manutencao, status: ficha.status }, data })`. Se `count === 0` → 409 `Ficha alterada por outra requisição`;
      - fechar o evento aberto: `saiu_em = agora`, `expirado = prazo_limite !== null && agora > prazo_limite`;
      - novo evento: `origem` = `'n8n'` ou `'usuario'`, `id_usuario` = `ator.id` ou `null`, `observacao: dados.observacao`, `prazo_limite = agora + prazo_horas` (null se não houver `PrazoStatus` para o status);
      - depois do commit: se `WEBHOOK_POR_STATUS[para]`, faz `await notificar(...)`; retorna a ficha atualizada.

- [ ] **Step 1: Escrever os testes** em `tests/fichaStatus.test.js` (`beforeEach(limparBanco)`; um helper local cria cliente + dispositivo + atendente + técnico + admin):
  - `criarFicha` cria ficha `aberta` e 1 evento aberto com `prazo_limite ≈ entrou_em + 4h` (diferença em ms === 4*3600e3)
  - `criarFicha` com dispositivo de outro cliente → rejeita com `{ status: 400 }`
  - fluxo completo `aberta→em_analise→em_espera→em_manutencao(n8n)→em_aprovacao→em_manutencao(admin, observacao)→em_aprovacao→consertado`: 8 eventos, só o último com `saiu_em === null`, `id_tecnico` gravado, `finalizada_em` preenchido, e os eventos de manutenção com `origem` correta
  - evento fechado depois do prazo: ajuste `prazo_limite` do evento aberto para o passado via `prisma.evento.updateMany`, mude o status e confira que o evento fechado tem `expirado === true`
  - `valor_servico: '-1'` → 400; `'12.345'` → 400; `'abc'` → 400 (Review Focus 4)
  - **concorrência** (Review Focus 1): `Promise.allSettled` com duas chamadas `mudarStatus(id, 'em_analise', tec)` → uma fulfilled e uma rejected com `status 409`; `prisma.evento.count({ where: { saiu_em: null } }) === 1`
  - ficha inexistente → 404

- [ ] **Step 2:** Run `node --test tests/fichaStatus.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implementar os três módulos.
- [ ] **Step 4:** Run `pnpm test`. Expected: tudo PASS.
- [ ] **Step 5: Commit** `feat(fichas): servico de criacao e mudanca de status com eventos`

---

### Task 4: Base HTTP: app, middlewares, tratamento de erro e login

**Files:**

- Create: `app.js`, `middlewares/trataErros.middleware.js`, `middlewares/validaApiKeyN8n.middleware.js`, `tests/helpers/app.js`, `tests/auth.test.js`
- Modify: `server.js`, `middlewares/auth.middleware.js`, `middlewares/validaCargo.middleware.js`, `controllers/auth.controller.js`, `repository/usuarios.repository.js` (só `buscarEmail` e o novo `buscarUsuarioPorId`)

**Interfaces:**

- Consumes: `ErroHttp`, `paraBigInt` (Task 2).
- Produces:
  - `app.js`: `export default app`. Faz `BigInt.prototype.toJSON`, `express.json()`, registra as rotas existentes e as novas (cada task seguinte adiciona sua linha `app.use`) e, por último, `trataErros`. `server.js` só faz `app.listen(3000, ...)`.
  - `trataErros(err, req, res, next)`: `ErroHttp` → `res.status(err.status).json({ erro: err.message })`; JSON malformado (`err.type === 'entity.parse.failed'`) → 400; `Prisma P2002` → 409 `Registro duplicado`; `P2025` → 404; qualquer outro → 500 `{ erro: 'ocorreu um erro inesperado..' }` + `console.error`.
  - `validaToken`: verifica o JWT, carrega o usuário com `buscarUsuarioPorId` e dá 401 se não existir ou `ativo === false` (Review Focus 3). `req.usuario = { id: bigint, nome, cargo }` vindo do banco, não do token.
  - `validaCargo(...cargos)`: rest params. Sem `req.usuario` → 401; cargo fora da lista → 403.
  - `validaApiKeyN8n`: header `x-api-key` igual a `process.env.N8N_API_KEY`, senão 401. Usar `crypto.timingSafeEqual` com o mesmo tamanho.
  - `login`: devolve 401 `Credenciais invalidas` também para `ativo === false`. Corrigir o `console.log(token)` do catch (spec §9).
  - `tests/helpers/app.js`: `export async function subirApp(): Promise<{ url: string, fechar: () => Promise<void> }>` (`app.listen(0)`); `export function req(url, token?)` devolve `{ get, post, put, patch }`, cada um retornando `{ status, corpo }`.
  - `repository/usuarios.repository.js`: `buscarUsuarioPorId(id_usuario: bigint)`.

- [ ] **Step 1: Escrever os testes** em `tests/auth.test.js`:
  - login com credenciais certas → 200 e `corpo.token`; senha errada → 401 `{ erro }`
  - login de usuário inativo → 401
  - `GET /usuarios` sem token → 401; com token de técnico → 403
  - token de usuário desativado depois da emissão (`prisma.usuario.update({ ativo:false })`) → 401 em `GET /fichas`
  - body JSON malformado no login → 400 `{ erro }`
- [ ] **Step 2:** Run `node --test tests/auth.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implementar. As rotas antigas de fichas e usuários podem continuar registradas e quebradas até as Tasks 5 e 7. Os testes desta task só usam a parte de auth e cargos delas. Se não der, registre um router vazio provisório.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): app separado, middlewares de auth/cargo/erros corrigidos`

---

### Task 5: API de usuários

**Files:**

- Rewrite: `controllers/usuarios.controller.js`, `repository/usuarios.repository.js`, `routes/usuarios.routes.js`
- Test: `tests/usuarios.test.js`

**Interfaces:**

- Consumes: Task 4 (`validaToken`, `validaCargo`, `ErroHttp`, `paraBigInt`, `subirApp`, `req`).
- Produces: rotas da spec §7 "Usuários", todas `validaToken, validaCargo('admin')`. Repository: `listarUsuarios()`, `criarUsuario(dados)`, `editarUsuario(id, dados)`, `alterarAtivo(id, ativo)`, `buscarEmail`, `buscarUsuarioPorId`. Nenhum devolve `senha_usuario`, exceto `buscarEmail` (o login precisa dele). Payload de criação: `nome_usuario`, `email_usuario`, `senha`, `cargo_usuario` (um dos `Cargos`), todos obrigatórios, senão 400.

- [ ] **Step 1: Testes:**
  - `POST /usuarios` sem token → 401 (deixou de ser público)
  - admin cria técnico → 201, e a resposta não tem `senha_usuario`
  - email duplicado → 409
  - `cargo_usuario: 'gerente'` → 400
  - `PUT` sem senha mantém o hash antigo e `PUT` com senha troca o hash (bug da spec §9)
  - `PATCH /usuarios/:id/ativo {ativo:false}` → 200 e o login dele passa a dar 401
  - `DELETE /usuarios/1` → 404
  - `PUT /usuarios/abc` → 400 (Review Focus 2)
- [ ] **Step 2:** Run `node --test tests/usuarios.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implementar. Remover `import { stat }` e o `require` (spec §9).
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): usuarios com ativo, sem delete e criacao restrita a admin`

---

### Task 6: API de clientes e dispositivos

**Files:**

- Create: `controllers/clientes.controller.js`, `controllers/dispositivos.controller.js`, `repository/clientes.repository.js`, `repository/dispositivos.repository.js`, `routes/clientes.routes.js`, `routes/dispositivos.routes.js`, `tests/clientes.test.js`
- Modify: `app.js` (`/clientes`, `/dispositivos`)

**Interfaces:**

- Produces: rotas da spec §7 "Clientes" e "Dispositivos". Leitura: `validaCargo('atendente','admin','tecnico')`. Escrita: `validaCargo('atendente','admin')`. `GET /clientes/:id` inclui `dispositivos` e `fichas` (só `id_manutencao`, `status`, `created_at`). Validação: `whatsapp_cliente` obrigatório e `/^\d{12,13}$/`; `nome_cliente` obrigatório; `tipo` em `TipoDispositivo`; `marca` e `modelo` obrigatórios; `numero_serie` opcional. `?busca=` faz `contains` com `insensitive` no nome ou `contains` no WhatsApp.

- [ ] **Step 1: Testes:**
  - atendente cria cliente → 201
  - WhatsApp `'11 99999-9999'` → 400
  - WhatsApp duplicado → 409
  - técnico tenta criar → 403
  - técnico lista → 200
  - `?busca=mar` acha "Maria"
  - criar dispositivo para cliente inexistente → 404
  - `tipo:'geladeira'` → 400
  - `GET /clientes/:id` traz o dispositivo criado
- [ ] **Step 2:** Run `node --test tests/clientes.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implementar. Paginação: `?pagina=&limite=`, com default 1/20 e máximo 100, marcada com `// DECISAO:`. Vale para todas as listagens a partir daqui.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): clientes e dispositivos`

---

### Task 7: API de fichas

**Files:**

- Rewrite: `controllers/fichas.controller.js`, `repository/fichas.repository.js`, `routes/fichas.routes.js`
- Test: `tests/fichas.test.js`

**Interfaces:**

- Consumes: `criarFicha`, `mudarStatus` (Task 3); `validaValor`, `validaTexto` (Task 3).
- Produces:
  - `repository/fichas.repository.js`: `listarFichas({ status?, id_tecnico?, id_cliente?, expirada?, pagina, limite })`, `buscarFichaPorId(id)` (inclui cliente, dispositivo, atendente, tecnico, eventos ordenados por `entrou_em`; usuários só com `id_usuario` e `nome_usuario`), `editarFicha(id, dados)` (nunca recebe `status`).
  - `export function etapaAtual(eventos, agora = new Date())`: devolve `{ status, entrou_em, prazo_limite, expirado }` do evento com `saiu_em === null`. `expirado` é calculado ao vivo. Cada ficha de `GET /fichas` e `GET /fichas/:id` vem com `etapa_atual`.
  - `expirada=true` → `eventos: { some: { saiu_em: null, prazo_limite: { lt: agora } } }`; `false` → `none` com a mesma condição.
  - Rotas (todas com `validaToken`):
    - `GET /` e `GET /:id`: todos os cargos.
    - `POST /`: atendente e admin.
    - `PUT /:id`: o controller aplica as regras de edição da spec §7. Atendente/admin podem editar `defeito_relatado`, `acessorios`, `estado_entrada`, `senha_dispositivo`, `observacao` se o status não for final. O técnico responsável pode editar `diagnostico` e `valor_servico` só em `em_analise`. Campo fora do permitido → 403. Status final → 409. `status` no body → 400.
    - `PATCH /:id/status`: atendente, admin e técnico. Chama `mudarStatus(id, body.status, { tipo:'usuario', id: req.usuario.id, cargo: req.usuario.cargo }, body)`.
  - Fichas criadas pela API respondem 201 com a ficha.

- [ ] **Step 1: Testes** (via HTTP):
  - atendente cria ficha → 201 com `status:'aberta'`
  - técnico cria → 403
  - `GET /fichas?status=aberta` lista a ficha com `etapa_atual.status === 'aberta'`
  - `PATCH status em_analise` (técnico) → 200 e `GET /:id` mostra `tecnico.nome_usuario` e 2 eventos
  - técnico faz `PUT {valor_servico:'99.90'}` em `em_analise` → 200; atendente fazendo o mesmo `PUT` → 403
  - `PUT {status:'consertado'}` → 400
  - `GET /fichas?expirada=true` acha a ficha depois de forçar o `prazo_limite` para o passado; com `false` não acha
  - `GET /fichas/abc` → 400
  - `DELETE /fichas/1` → 404
- [ ] **Step 2:** Run `node --test tests/fichas.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): fichas com fluxo de status, etapa atual e filtros`

---

### Task 8: Integração n8n (webhook de saída e endpoint de orçamento)

**Files:**

- Rewrite: `services/n8n.service.js`
- Create: `controllers/integracoes.controller.js`, `routes/integracoes.routes.js`, `tests/n8n.test.js`
- Modify: `app.js` (`/integracoes/n8n`)

**Interfaces:**

- Consumes: `mudarStatus` (Task 3), `validaApiKeyN8n` (Task 4), `buscarFichaPorId` (Task 7).
- Produces:
  - `notificar(evento, id_manutencao)`: lê `N8N_WEBHOOK_URL` em tempo de chamada. Sem URL → `console.warn` e retorna. Com URL, carrega a ficha e faz `fetch` POST JSON com o payload exato da spec §7. Usa timeout de 5 s (`AbortSignal.timeout(5000)`). Qualquer erro ou status ≥ 400 → `console.error` e retorna, **nunca lança**.
  - `POST /integracoes/n8n/fichas/:id_manutencao/orcamento` `{ aprovado: boolean }` (`aprovado` precisa ser boolean, senão 400). Chama `mudarStatus(id, aprovado ? 'em_manutencao' : 'cancelado', { tipo:'n8n' })` e responde `{ mensagem, status }`.

- [ ] **Step 1: Testes.** Suba um `http.createServer` local na porta 0 que guarda os bodies recebidos, e aponte `process.env.N8N_WEBHOOK_URL` para ele.
  - levar uma ficha até `em_espera` → o servidor recebeu 1 POST com `evento:'orcamento'`, `cliente.whatsapp`, `valor_servico:'150'` (ou `'150.00'`; afirme com `Number(...) === 150`)
  - `POST .../orcamento {aprovado:true}` sem `x-api-key` → 401; com a chave → 200 e a ficha fica em `em_manutencao`, com o último evento `origem:'n8n'` e `id_usuario:null`
  - outra ficha em `em_espera` + `{aprovado:false}` → `cancelado`
  - `{aprovado:'sim'}` → 400
  - ficha `em_analise` + `{aprovado:true}` → 409
  - `admin` leva a ficha até `consertado` → o servidor recebeu `evento:'retirada'`
  - o webhook falha (servidor responde 500, ou a URL aponta para uma porta fechada) → a transição devolve 200 e o status muda mesmo assim
- [ ] **Step 2:** Run `node --test tests/n8n.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implementar. Reenvio de webhook que falhou: `// DECISAO: reenvio — escolhido: só log; alternativas: fila/tabela de pendências`.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(n8n): webhook de orcamento/retirada e endpoint de resposta do cliente`

---

### Task 9: Prazos (SLA)

**Files:**

- Create: `controllers/prazos.controller.js`, `repository/prazos.repository.js`, `routes/prazos.routes.js`, `tests/prazos.test.js`
- Modify: `app.js` (`/prazos`)

**Interfaces:**

- Produces: `GET /prazos` e `PUT /prazos/:status { prazo_horas }`, só para admin. `:status` precisa ser um status não-final (senão 400). `prazo_horas` é inteiro de 1 a 720 (senão 400). Faz upsert.

- [ ] **Step 1: Testes:**
  - `GET` → 5 itens
  - `PUT /prazos/em_manutencao {prazo_horas:48}` → 200
  - uma ficha que entra em `em_manutencao` depois do `PUT` tem `prazo_limite` de 48 h, e um evento criado antes do `PUT` mantém o prazo antigo
  - `PUT /prazos/consertado` → 400
  - `prazo_horas: 0` → 400
  - técnico → 403
- [ ] **Step 2–4:** FAIL → implementar → `pnpm test` PASS.
- [ ] **Step 5: Commit** `feat(api): prazos por status editaveis pelo admin`

---

### Task 10: Métricas

**Files:**

- Create: `repository/metricas.repository.js`, `controllers/metricas.controller.js`, `routes/metricas.routes.js`, `tests/metricas.test.js`
- Modify: `app.js` (`/metricas`)

**Interfaces:**

- Produces: as quatro rotas da spec §7 "Métricas", só para admin. Query: `de`, `ate` (`YYYY-MM-DD`, obrigatórios, `de ≤ ate`, senão 400) e `id_tecnico` opcional (`paraBigInt`).
  - O intervalo vira `[de 00:00, ate+1 00:00)` em `America/Sao_Paulo`. No SQL: `campo >= (${de}::date AT TIME ZONE 'America/Sao_Paulo') AND campo < ((${ate}::date + 1) AT TIME ZONE 'America/Sao_Paulo')` (Review Focus 5).
  - Horas = `EXTRACT(EPOCH FROM intervalo) / 3600`, arredondado com 2 casas. Converta `bigint`/`Decimal` do `$queryRaw` para `Number` antes de responder.
  - Formatos de resposta:
    - `concluidas-por-dia`: `{ total: [{ dia, consertadas, canceladas }], por_tecnico: [{ id_tecnico, nome_tecnico, dia, consertadas, canceladas }] }`. Base: `Ficha.finalizada_em` no intervalo, com `dia` = `finalizada_em` convertido para SP. Fichas canceladas sem técnico aparecem só em `total`.
    - `tempo-por-status`: `[{ status, fichas, media_horas, mediana_horas, max_horas }]`. Primeiro soma as passagens por `(id_manutencao, status)` de eventos fechados com `saiu_em` no intervalo, depois agrega por status (mediana = `percentile_cont(0.5)`).
    - `tempo-total`: `{ total: { fichas, media_horas, mediana_horas }, por_tecnico: [{ id_tecnico, nome_tecnico, fichas, media_horas, mediana_horas }] }`. Considera fichas `consertado` com `finalizada_em` no intervalo, medindo `finalizada_em - created_at`.
    - `prazos`: `{ por_status: [{ status, eventos, expirados, percentual }], por_tecnico: [{ id_tecnico, nome_tecnico, eventos, expirados, percentual }], fichas_atrasadas: [{ id_manutencao, status, entrou_em, prazo_limite, id_tecnico }] }`. A base são os eventos com `prazo_limite` não nulo e `entrou_em` no intervalo. Um evento conta como expirado se `expirado` está gravado (fechado) ou se `saiu_em IS NULL AND prazo_limite < now()`. `fichas_atrasadas` ignora o intervalo e lista todas as etapas abertas estouradas agora.
  - Com `id_tecnico`, todas as consultas filtram por `Ficha.id_tecnico`.

- [ ] **Step 1: Testes.** Monte os dados direto com `prisma` (fichas e eventos com datas fixas, sem passar por `mudarStatus`), para os números serem exatos:
  - 2 fichas do técnico A consertadas em `2026-10-10` e 1 cancelada no mesmo dia; 1 do técnico B consertada em `2026-10-11T02:30:00Z` (= 23:30 do dia 10 em SP) → `concluidas-por-dia?de=2026-10-10&ate=2026-10-10` dá `total[0] = { dia:'2026-10-10', consertadas:3, canceladas:1 }`
  - a mesma consulta com `id_tecnico=B` → consertadas 1
  - ficha com dois eventos `em_manutencao` de 2 h e 3 h → `tempo-por-status` dá `em_manutencao.max_horas === 5` (soma das passagens)
  - `tempo-total` de uma ficha criada às 10:00 e finalizada às 22:00 → `media_horas === 12`
  - `prazos`: um evento fechado com `expirado:true` e um aberto com `prazo_limite` no passado → `expirados === 2` e `fichas_atrasadas.length === 1`
  - sem `de` → 400; `de > ate` → 400; técnico → 403
- [ ] **Step 2:** Run `node --test tests/metricas.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implementar com `prisma.$queryRaw` (tagged template, nunca concatenando strings).
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): metricas de conclusao, tempo por status, tempo total e prazos`

---

### Task 11: Limpeza final e documentação

**Files:**

- Modify: `README.md`, qualquer arquivo com resto de código antigo

- [ ] **Step 1:** `grep -rn "prisma.fichas\|prisma.usuarios\|import { stat }\|require(" --include=*.js . --exclude-dir=node_modules --exclude-dir=frontend`. Expected: nenhuma ocorrência.
- [ ] **Step 2:** README: troque `pnpm run db:init` pelo fluxo `migrate reset` + `db:seed`. Documente as variáveis novas, o banco de teste (`TEST_DATABASE_URL` + `pnpm test:db` + `pnpm test`), uma tabela curta das rotas e o comando `grep -rn "DECISAO:"`.
- [ ] **Step 3:** Run `pnpm prettier . --check && pnpm test`. Expected: sem diferenças de formatação e todos os testes PASS.
- [ ] **Step 4:** Subir a API de verdade (`pnpm dev`), fazer login com o admin do seed e chamar `GET /fichas` e `GET /metricas/prazos?de=2026-10-01&ate=2026-10-31`. Expected: 200 nas duas.
- [ ] **Step 5: Commit** `docs: readme com novo fluxo de banco, testes e rotas`
