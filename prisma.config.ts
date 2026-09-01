import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'models',
  datasource: {
    url: env('DB_URL'),
  },
})
