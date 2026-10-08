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
# inicializar o database
pnpm run db:init
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
# primeira migration e schema inicial caso o banco nao tenha
pnpm prisma migrate dev --name init

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
