import './helpers/env.js'
import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../database/connection.js'
import { limparBanco, criaUsuarioTeste } from './helpers/db.js'
import { subirApp, req } from './helpers/app.js'

let api

before(async () => {
  api = await subirApp()
})
beforeEach(limparBanco)
after(async () => {
  await api.fechar()
  await prisma.$disconnect()
})

test('login com credenciais certas devolve token', async () => {
  await criaUsuarioTeste({ cargo: 'admin', email: 'a@wefix.test' })
  const { status, corpo } = await req(api.url).post('/auth/login', {
    email_usuario: 'a@wefix.test',
    senha: 'senha123',
  })
  assert.equal(status, 200)
  assert.ok(corpo.token)
})

test('senha errada dá 401 com { erro }', async () => {
  await criaUsuarioTeste({ cargo: 'admin', email: 'a@wefix.test' })
  const { status, corpo } = await req(api.url).post('/auth/login', {
    email_usuario: 'a@wefix.test',
    senha: 'errada',
  })
  assert.equal(status, 401)
  assert.ok(corpo.erro)
})

test('usuário inativo não faz login', async () => {
  await criaUsuarioTeste({
    cargo: 'admin',
    email: 'a@wefix.test',
    ativo: false,
  })
  const { status } = await req(api.url).post('/auth/login', {
    email_usuario: 'a@wefix.test',
    senha: 'senha123',
  })
  assert.equal(status, 401)
})

test('rota de admin: sem token 401, técnico 403', async () => {
  const { token } = await criaUsuarioTeste({ cargo: 'tecnico' })
  assert.equal((await req(api.url).get('/usuarios')).status, 401)
  assert.equal((await req(api.url, token).get('/usuarios')).status, 403)
})

test('validaCargo aceita qualquer cargo da lista', async () => {
  const { token } = await criaUsuarioTeste({ cargo: 'tecnico' })
  const { status } = await req(api.url, token).get('/fichas')
  assert.notEqual(status, 401)
  assert.notEqual(status, 403)
})

test('token de usuário desativado depois da emissão dá 401', async () => {
  const { usuario, token } = await criaUsuarioTeste({ cargo: 'tecnico' })
  await prisma.usuario.update({
    where: { id_usuario: usuario.id_usuario },
    data: { ativo: false },
  })
  const { status, corpo } = await req(api.url, token).get('/fichas')
  assert.equal(status, 401)
  assert.ok(corpo.erro)
})

test('JSON malformado dá 400 com { erro }', async () => {
  const { status, corpo } = await req(api.url).post('/auth/login', '{"x":', {
    bruto: true,
  })
  assert.equal(status, 400)
  assert.ok(corpo.erro)
})
