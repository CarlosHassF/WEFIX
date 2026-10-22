import pkg from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

const { PrismaClient } = pkg

dotenv.config() // carrega .env

// conecta o Prisma ao driver PostgreSQL
// DATABASE_URL indica o server, port, user, password e database
// sessao em UTC: o adapter envia Date sem fuso, e o postgres o interpretaria
// no fuso do servidor (ex.: America/Sao_Paulo), deslocando os horarios gravados
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  options: '-c TimeZone=UTC',
})

// Client oferece metodos de ORM conectando ao banco
// metodos: create, findMany, update, etc.
const prisma = new PrismaClient({ adapter })

export default prisma // exporta o PrismaCLient
