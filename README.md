## Dependencias

- Node.js
- npm
- pnpm
- Prisma ORM

```bash
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
```
