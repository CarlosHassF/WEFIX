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
