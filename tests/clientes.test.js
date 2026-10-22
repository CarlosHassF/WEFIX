import './helpers/env.js'
import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../database/connection.js'
import { limparBanco, criaUsuarioTeste } from './helpers/db.js'
import { subirApp, req } from './helpers/app.js'

let api
let atendente
let tecnico

const maria = { nome_cliente: 'Maria Silva', whatsapp_cliente: '5511999999999' }
const celular = { tipo: 'celular', marca: 'Motorola', modelo: 'G8' }

before(async () => {
  api = await subirApp()
})
beforeEach(async () => {
  await limparBanco()
  atendente = req(
    api.url,
    (await criaUsuarioTeste({ cargo: 'atendente' })).token
  )
  tecnico = req(api.url, (await criaUsuarioTeste({ cargo: 'tecnico' })).token)
})
after(async () => {
  await api.fechar()
  await prisma.$disconnect()
})

test('atendente cria cliente', async () => {
  const { status, corpo } = await atendente.post('/clientes', maria)
  assert.equal(status, 201)
  assert.equal(corpo.nome_cliente, 'Maria Silva')
})

test('whatsapp fora do formato dá 400', async () => {
  const { status } = await atendente.post('/clientes', {
    ...maria,
    whatsapp_cliente: '11 99999-9999',
  })
  assert.equal(status, 400)
})

test('nome obrigatório', async () => {
  const { status } = await atendente.post('/clientes', {
    whatsapp_cliente: '5511999999999',
  })
  assert.equal(status, 400)
})

test('whatsapp duplicado dá 409', async () => {
  await atendente.post('/clientes', maria)
  const { status } = await atendente.post('/clientes', maria)
  assert.equal(status, 409)
})

test('técnico não cria, mas lista', async () => {
  assert.equal((await tecnico.post('/clientes', maria)).status, 403)
  await atendente.post('/clientes', maria)
  const { status, corpo } = await tecnico.get('/clientes')
  assert.equal(status, 200)
  assert.equal(corpo.length, 1)
})

test('busca por parte do nome ou do whatsapp', async () => {
  await atendente.post('/clientes', maria)
  await atendente.post('/clientes', {
    nome_cliente: 'João',
    whatsapp_cliente: '5521888888888',
  })
  const nome = await atendente.get('/clientes?busca=mar')
  assert.deepEqual(
    nome.corpo.map((c) => c.nome_cliente),
    ['Maria Silva']
  )
  const fone = await atendente.get('/clientes?busca=21888')
  assert.deepEqual(
    fone.corpo.map((c) => c.nome_cliente),
    ['João']
  )
})

test('editar cliente', async () => {
  const { corpo } = await atendente.post('/clientes', maria)
  const { status, corpo: editado } = await atendente.put(
    `/clientes/${corpo.id_cliente}`,
    { nome_cliente: 'Maria S.' }
  )
  assert.equal(status, 200)
  assert.equal(editado.nome_cliente, 'Maria S.')
  assert.equal(editado.whatsapp_cliente, maria.whatsapp_cliente)
})

test('dispositivo para cliente inexistente dá 404', async () => {
  const { status } = await atendente.post('/clientes/999/dispositivos', celular)
  assert.equal(status, 404)
})

test('tipo de dispositivo inválido dá 400', async () => {
  const { corpo } = await atendente.post('/clientes', maria)
  const { status } = await atendente.post(
    `/clientes/${corpo.id_cliente}/dispositivos`,
    { ...celular, tipo: 'geladeira' }
  )
  assert.equal(status, 400)
})

test('cliente detalhado traz dispositivos; dispositivo editável', async () => {
  const { corpo: cliente } = await atendente.post('/clientes', maria)
  const criado = await atendente.post(
    `/clientes/${cliente.id_cliente}/dispositivos`,
    { ...celular, numero_serie: 'IMEI123' }
  )
  assert.equal(criado.status, 201)

  const lista = await tecnico.get(
    `/clientes/${cliente.id_cliente}/dispositivos`
  )
  assert.equal(lista.corpo.length, 1)

  const editado = await atendente.put(
    `/dispositivos/${criado.corpo.id_dispositivo}`,
    { modelo: 'G9' }
  )
  assert.equal(editado.status, 200)
  assert.equal(editado.corpo.modelo, 'G9')

  const { corpo } = await tecnico.get(`/clientes/${cliente.id_cliente}`)
  assert.equal(corpo.dispositivos[0].modelo, 'G9')
  assert.deepEqual(corpo.fichas, [])
})

test('cliente inexistente dá 404 e id inválido 400', async () => {
  assert.equal((await tecnico.get('/clientes/999')).status, 404)
  assert.equal((await tecnico.get('/clientes/abc')).status, 400)
})

test('rota inexistente responde JSON 404', async () => {
  const { status, corpo } = await tecnico.get('/nao-existe')
  assert.equal(status, 404)
  assert.ok(corpo.erro)
})
