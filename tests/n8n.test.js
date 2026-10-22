import './helpers/env.js'
import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import prisma from '../database/connection.js'
import { limparBanco, criaUsuarioTeste } from './helpers/db.js'
import { subirApp, req } from './helpers/app.js'
import { criarFicha, mudarStatus } from '../services/fichaStatus.service.js'

let api
let n8n
let recebidos
let respostaN8n
let ctx

// servidor que faz o papel do webhook do n8n
before(async () => {
  api = await subirApp()
  n8n = http.createServer((pedido, resposta) => {
    let corpo = ''
    pedido.on('data', (parte) => (corpo += parte))
    pedido.on('end', () => {
      recebidos.push(JSON.parse(corpo))
      resposta.statusCode = respostaN8n
      resposta.end()
    })
  })
  await new Promise((resolve) => n8n.listen(0, resolve))
})
beforeEach(async () => {
  await limparBanco()
  recebidos = []
  respostaN8n = 200
  process.env.N8N_WEBHOOK_URL = `http://127.0.0.1:${n8n.address().port}/webhook`

  const cliente = await prisma.cliente.create({
    data: { nome_cliente: 'Maria', whatsapp_cliente: '5511999999999' },
  })
  const dispositivo = await prisma.dispositivo.create({
    data: {
      id_cliente: cliente.id_cliente,
      tipo: 'celular',
      marca: 'Moto',
      modelo: 'G8',
    },
  })
  const { usuario: atendente } = await criaUsuarioTeste({ cargo: 'atendente' })
  const { usuario: t } = await criaUsuarioTeste({ cargo: 'tecnico' })
  const { usuario: a } = await criaUsuarioTeste({ cargo: 'admin' })
  ctx = {
    tec: { tipo: 'usuario', id: t.id_usuario, cargo: 'tecnico' },
    admin: { tipo: 'usuario', id: a.id_usuario, cargo: 'admin' },
    nova: async () =>
      (
        await criarFicha(
          {
            id_cliente: cliente.id_cliente,
            id_dispositivo: dispositivo.id_dispositivo,
            defeito_relatado: 'tela',
          },
          atendente.id_usuario
        )
      ).id_manutencao,
  }
})
after(async () => {
  await api.fechar()
  await new Promise((resolve) => n8n.close(resolve))
  await prisma.$disconnect()
})

async function emEspera() {
  const id = await ctx.nova()
  await mudarStatus(id, 'em_analise', ctx.tec)
  await mudarStatus(id, 'em_espera', ctx.tec, {
    diagnostico: 'trocar tela',
    valor_servico: '150',
  })
  return id
}

function responder(id, corpo, chave = 'chave-teste') {
  return fetch(`${api.url}/integracoes/n8n/fichas/${id}/orcamento`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': chave },
    body: JSON.stringify(corpo),
  })
}

test('entrar em em_espera envia o orçamento ao n8n', async () => {
  const id = await emEspera()
  assert.equal(recebidos.length, 1)
  const [msg] = recebidos
  assert.equal(msg.evento, 'orcamento')
  assert.equal(msg.id_manutencao, id.toString())
  assert.deepEqual(msg.cliente, { nome: 'Maria', whatsapp: '5511999999999' })
  assert.deepEqual(msg.dispositivo, {
    tipo: 'celular',
    marca: 'Moto',
    modelo: 'G8',
  })
  assert.equal(msg.diagnostico, 'trocar tela')
  assert.equal(Number(msg.valor_servico), 150)
})

test('resposta do cliente exige a chave do n8n', async () => {
  const id = await emEspera()
  assert.equal((await responder(id, { aprovado: true }, 'errada')).status, 401)
  assert.equal((await responder(id, { aprovado: true }, '')).status, 401)
})

test('cliente aprova: ficha vai para manutenção com evento do n8n', async () => {
  const id = await emEspera()
  const resposta = await responder(id, { aprovado: true })
  assert.equal(resposta.status, 200)
  assert.equal((await resposta.json()).status, 'em_manutencao')
  const ultimo = await prisma.evento.findFirst({
    where: { id_manutencao: id, saiu_em: null },
  })
  assert.equal(ultimo.status, 'em_manutencao')
  assert.equal(ultimo.origem, 'n8n')
  assert.equal(ultimo.id_usuario, null)
})

test('cliente recusa: ficha cancelada', async () => {
  const id = await emEspera()
  await responder(id, { aprovado: false })
  const ficha = await prisma.ficha.findUnique({ where: { id_manutencao: id } })
  assert.equal(ficha.status, 'cancelado')
})

test('aprovado precisa ser boolean', async () => {
  const id = await emEspera()
  assert.equal((await responder(id, { aprovado: 'sim' })).status, 400)
})

test('resposta para ficha fora de em_espera dá 409', async () => {
  const id = await ctx.nova()
  await mudarStatus(id, 'em_analise', ctx.tec)
  assert.equal((await responder(id, { aprovado: true })).status, 409)
})

test('consertado avisa a retirada', async () => {
  const id = await emEspera()
  await responder(id, { aprovado: true })
  await mudarStatus(id, 'em_aprovacao', ctx.tec)
  await mudarStatus(id, 'consertado', ctx.admin)
  assert.deepEqual(
    recebidos.map((m) => m.evento),
    ['orcamento', 'retirada']
  )
})

test('falha do webhook não desfaz a transição', async () => {
  respostaN8n = 500
  const id = await emEspera()
  const ficha = await prisma.ficha.findUnique({ where: { id_manutencao: id } })
  assert.equal(ficha.status, 'em_espera')

  process.env.N8N_WEBHOOK_URL = 'http://127.0.0.1:1/fechado'
  await responder(id, { aprovado: true })
  await mudarStatus(id, 'em_aprovacao', ctx.tec)
  const final = await mudarStatus(id, 'consertado', ctx.admin)
  assert.equal(final.status, 'consertado')
})
