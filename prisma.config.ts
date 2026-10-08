import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  // onde estão os schemas e os models
  schema: 'models',
  // produtor de info para database
  datasource: {
    url: env('DATABASE_URL'),
  },
  // onde estão as migrations
  migrations: {
    path: 'database/migrations'
  }
})
