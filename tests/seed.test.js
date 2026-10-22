import './helpers/env.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../database/connection.js'
import { limparBanco } from './helpers/db.js'
import { semearAdmin, PRAZOS_INICIAIS } from '../database/seed.js'

before(limparBanco)
after(() => prisma.$disconnect())

test('limparBanco deixa um prazo por status não-final', async () => {
  const prazos = await prisma.prazoStatus.findMany()
  assert.equal(prazos.length, 5)
  assert.equal(
    prazos.find((p) => p.status === 'em_manutencao').prazo_horas,
    PRAZOS_INICIAIS.em_manutencao
  )
})

test('semearAdmin é idempotente e grava hash', async () => {
  await semearAdmin(prisma, 'adm@wefix.test', 'segredo')
  const u = await semearAdmin(prisma, 'adm@wefix.test', 'segredo')
  assert.equal(u.cargo_usuario, 'admin')
  assert.notEqual(u.senha_usuario, 'segredo')
  assert.equal(await prisma.usuario.count(), 1)
})
