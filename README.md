## Dependencias

- Node.js
- npm
- pnpm
- Prisma ORM

## Quick Start no modo dev:

```bash
# INSTALAR E RODAR
# instalar dependencias
pnpm install
# gerar client Prisma
pnpm run prisma:generate
# rodar em modo dev
pnpm run dev
# formatar e indentar codigo conforme config prettier
pnpm prettier . --write
# validacao prettier
pnpm prettier . --check
# geração do jwtSecret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# criação do db local com prisma e postgres
pnpm dlx create-db@latest
# export da string e url de conexao para o .env
export DATABASE_URL="<the connection string create-db printed>"
# inicializar o database (aplica migrations e cria admin inicial + prazos)
pnpm prisma migrate deploy
pnpm prisma generate
pnpm run db:seed
# inicializar o prototipo em modo dev
pnpm run dev

# SUBIR BANCO
# Subir o postgres sem docker no WSL / Ubuntu
sudo apt update
sudo apt install postgresql postgresql-contrib

# Inicia o serviço
sudo systemctl start postgresql

# Cria usuário e banco
sudo -u postgres psql -c "CREATE USER wefix_user WITH PASSWORD 'wefix_senha_123';"
sudo -u postgres psql -c "CREATE DATABASE wefix_db OWNER wefix_user;"
sudo -u postgres psql -c "ALTER USER wefix_user WITH SUPERUSER;"
# banco separado para os testes automatizados
sudo -u postgres psql -c "CREATE DATABASE wefix_test OWNER wefix_user;"

# ou com Docker
# criar container postgres
docker run \
  --name postgres-wefix \
  -e POSTGRES_USER=wefix_user \
  -e POSTGRES_PASSWORD=wefix_senha_123 \
  -e POSTGRES_DB=wefix_db \
  -p 5432:5432 \
  -d postgres:15
# verifica se subiu
docker ps | grep postgres
# verifique .env com a url do database

# CRIACAO DO CLIENT PRISMA
# depois gere prisma client caso o pnpm install nao tenha gerado
pnpm prisma generate
# aplicar migrations no banco de dev e criar admin inicial + prazos
pnpm prisma migrate dev
pnpm run db:seed
# ao alterar os models em models/*.prisma, gerar nova migration
pnpm prisma migrate dev --name <descricao_da_mudanca>
# recriar o banco de dev do zero (APAGA TODOS OS DADOS)
pnpm prisma migrate reset

# checar manualmente a criaçao do banco no postgres CLI
# conexao do banco pelo CLI
psql postgresql://wefix_user:wefix_senha_123@localhost:5432/wefix_db

# checagem
\dt
SELECT * FROM "<tabela>";
SELECT * FROM "<tabela2>";
# ...
\q # exit

# rodar a aplicacao tambem é possivel para ver o banco visualmente via pgAdmin4 ou DBeaver
pnpm run dev

```

## Variaveis de ambiente

Veja `.env.example`.

| Variavel            | Uso                                                         |
| ------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`      | banco de desenvolvimento                                    |
| `TEST_DATABASE_URL` | banco dos testes (zerado a cada suite)                      |
| `JWT_SECRET`        | assinatura dos tokens de login                              |
| `N8N_API_KEY`       | chave que o n8n envia no header `x-api-key`                 |
| `N8N_WEBHOOK_URL`   | webhook do n8n que recebe os eventos `orcamento`/`retirada` |
| `ADMIN_EMAIL`       | email do admin inicial criado pelo seed                     |
| `ADMIN_SENHA`       | senha do admin inicial criado pelo seed                     |

## Testes

```bash
# aplica as migrations no banco de testes (TEST_DATABASE_URL)
pnpm run test:db
# roda todos os testes (node:test)
pnpm test
```

## Rotas

Todas exigem `Authorization: Bearer <token>`, exceto o login e as rotas do n8n.

| Metodo e rota                                                                                 | Quem                                   |
| --------------------------------------------------------------------------------------------- | -------------------------------------- |
| `POST /auth/login`                                                                            | publico                                |
| `GET/POST /usuarios`, `PUT /usuarios/:id`                                                     | admin                                  |
| `PATCH /usuarios/:id/ativo`                                                                   | admin                                  |
| `GET /clientes?busca=`, `GET /clientes/:id`                                                   | todos                                  |
| `POST /clientes`, `PUT /clientes/:id`                                                         | atendente, admin                       |
| `GET/POST /clientes/:id/dispositivos`                                                         | leitura todos, criacao atendente/admin |
| `PUT /dispositivos/:id`                                                                       | atendente, admin                       |
| `GET /fichas?status=&id_tecnico=&id_cliente=&expirada=`                                       | todos                                  |
| `GET /fichas/:id`                                                                             | todos                                  |
| `POST /fichas`                                                                                | atendente, admin                       |
| `PUT /fichas/:id`                                                                             | conforme o campo e o status            |
| `PATCH /fichas/:id/status`                                                                    | conforme a transicao                   |
| `GET /prazos`, `PUT /prazos/:status`                                                          | admin                                  |
| `GET /metricas/{concluidas-por-dia,tempo-por-status,tempo-total,prazos}?de=&ate=&id_tecnico=` | admin                                  |
| `POST /integracoes/n8n/fichas/:id/orcamento`                                                  | n8n (`x-api-key`)                      |

Fluxo e regras de status: `docs/superpowers/specs/2026-10-22-ordens-de-servico-design.md`.

## Decisoes de implementacao

Escolhas deixadas em aberto pelo design estao marcadas no codigo:

```bash
grep -rn "DECISAO:" --exclude-dir=node_modules .
```
