/*
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const {Pool} = pg;

const db = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_BANCO,
    connectionTimeoutMillis: 5000
});

export default db;
*/

import pkg from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

const { PrismaClient } = pkg;

dotenv.config() // carrega .env

// conecta o Prisma ao driver PostgreSQL
// DATABASE_URL indica o server, port, user, password e database
const adapter = new PrismaPg({ connectionString: process.env.DB_URL })

// Client oferece metodos de ORM conectando ao banco
// metodos: create, findMany, update, delete, etc.
const prisma = new PrismaClient({ adapter })

export default prisma // exporta o PrismaCLient
