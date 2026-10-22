import './helpers/env.js'
import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../database/connection.js'
import { limparBanco, criaUsuarioTeste } from './helpers/db.js'
import { subirApp, req } from './helpers/app.js'

let api
let admin

const novoTecnico = {
  nome_usuario: 'Téc Novo',
  email_usuario: 'tec@wefix.test',
  senha: 'abc12345',
  cargo_usuario: 'tecnico',
}

before(async () => {
  api = await subirApp()
})
beforeEach(async () => {
  await limparBanco()
  const { token } = await criaUsuarioTeste({ cargo: 'admin' })
  admin = req(api.url, token)
})
after(async () => {
  await api.fechar()
  await prisma.$disconnect()
})

test('POST /usuarios sem token dá 401', async () => {
  const { status } = await req(api.url).post('/usuarios', novoTecnico)
  assert.equal(status, 401)
})

test('admin cria técnico sem expor a senha', async () => {
  const { status, corpo } = await admin.post('/usuarios', novoTecnico)
  assert.equal(status, 201)
  assert.equal(corpo.cargo_usuario, 'tecnico')
  assert.equal(corpo.senha_usuario, undefined)
})

test('listagem não expõe senha', async () => {
  const { status, corpo } = await admin.get('/usuarios')
  assert.equal(status, 200)
  assert.equal(corpo.length, 1)
  assert.equal(corpo[0].senha_usuario, undefined)
})

test('email duplicado dá 409', async () => {
  await admin.post('/usuarios', novoTecnico)
  const { status } = await admin.post('/usuarios', novoTecnico)
  assert.equal(status, 409)
})

test('cargo inválido e campo faltando dão 400', async () => {
  const cargo = await admin.post('/usuarios', {
    ...novoTecnico,
    cargo_usuario: 'gerente',
  })
  assert.equal(cargo.status, 400)
  const { senha, ...semSenha } = novoTecnico
  assert.equal((await admin.post('/usuarios', semSenha)).status, 400)
})

test('PUT sem senha mantém hash, com senha troca', async () => {
  const { corpo } = await admin.post('/usuarios', novoTecnico)
  const id = corpo.id_usuario
  const antes = await prisma.usuario.findUnique({
    where: { id_usuario: BigInt(id) },
  })

  const semSenha = await admin.put(`/usuarios/${id}`, { nome_usuario: 'Outro' })
  assert.equal(semSenha.status, 200)
  const meio = await prisma.usuario.findUnique({
    where: { id_usuario: BigInt(id) },
  })
  assert.equal(meio.nome_usuario, 'Outro')
  assert.equal(meio.senha_usuario, antes.senha_usuario)

  await admin.put(`/usuarios/${id}`, { senha: 'nova12345' })
  const login = await req(api.url).post('/auth/login', {
    email_usuario: novoTecnico.email_usuario,
    senha: 'nova12345',
  })
  assert.equal(login.status, 200)
})

test('desativar usuário bloqueia o login', async () => {
  const { corpo } = await admin.post('/usuarios', novoTecnico)
  const { status } = await admin.patch(`/usuarios/${corpo.id_usuario}/ativo`, {
    ativo: false,
  })
  assert.equal(status, 200)
  const login = await req(api.url).post('/auth/login', {
    email_usuario: novoTecnico.email_usuario,
    senha: novoTecnico.senha,
  })
  assert.equal(login.status, 401)
})

test('ativo precisa ser boolean', async () => {
  const { corpo } = await admin.post('/usuarios', novoTecnico)
  const { status } = await admin.patch(`/usuarios/${corpo.id_usuario}/ativo`, {
    ativo: 'nao',
  })
  assert.equal(status, 400)
})

test('não existe DELETE de usuário', async () => {
  assert.equal((await admin.delete('/usuarios/1')).status, 404)
})

test('id inválido na URL dá 400', async () => {
  const { status, corpo } = await admin.put('/usuarios/abc', {
    nome_usuario: 'x',
  })
  assert.equal(status, 400)
  assert.ok(corpo.erro)
})

test('usuário inexistente dá 404', async () => {
  const { status } = await admin.put('/usuarios/999', { nome_usuario: 'x' })
  assert.equal(status, 404)
})
