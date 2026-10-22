import pkg from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

const { PrismaClient } = pkg

dotenv.config() // carrega .env

// conecta o Prisma ao driver PostgreSQL
// DATABASE_URL indica o server, port, user, password e database
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

// Client oferece metodos de ORM conectando ao banco
// metodos: create, findMany, update, etc.
const prisma = new PrismaClient({ adapter })

export default prisma // exporta o PrismaCLient
