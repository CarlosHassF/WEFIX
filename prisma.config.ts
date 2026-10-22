import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  // onde estão os schemas e os models
  schema: 'models',
  // produtor de info para database; PRISMA_ALVO=teste aponta para o banco de testes
  datasource: {
    url:
      process.env.PRISMA_ALVO === 'teste'
        ? env('TEST_DATABASE_URL')
        : env('DATABASE_URL'),
  },
  // onde estão as migrations e o seed
  migrations: {
    path: 'database/migrations',
    seed: 'node database/seed.js',
  },
})
