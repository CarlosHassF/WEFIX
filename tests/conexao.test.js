import './helpers/env.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../database/connection.js'
import { limparBanco } from './helpers/db.js'

before(limparBanco)
after(() => prisma.$disconnect())

// datas gravadas pelo prisma devem ser o mesmo instante para o sql (metricas, now())
test('Date gravado pelo prisma é o mesmo instante no postgres', async () => {
  const cliente = await prisma.cliente.create({
    data: {
      nome_cliente: 'tz',
      whatsapp_cliente: '5500000000001',
      created_at: new Date('2026-10-11T01:00:00Z'),
    },
  })
  const [linha] = await prisma.$queryRaw`
    SELECT created_at = '2026-10-11T01:00:00Z'::timestamptz AS igual
    FROM "Cliente" WHERE id_cliente = ${cliente.id_cliente}`
  assert.equal(linha.igual, true)
})
