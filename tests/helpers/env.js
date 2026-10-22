// importado primeiro em todo teste que usa banco: aponta o prisma para o banco de testes
import dotenv from 'dotenv'

dotenv.config()

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL não definido (veja .env.example)')
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.JWT_SECRET ??= 'teste'
process.env.N8N_API_KEY ??= 'chave-teste'
delete process.env.N8N_WEBHOOK_URL
