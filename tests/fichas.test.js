import './helpers/env.js'
import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../database/connection.js'
import { limparBanco, criaUsuarioTeste } from './helpers/db.js'
import { subirApp, req } from './helpers/app.js'

let api
let atendente
let tecnico
let admin
let nomeTecnico
let base

before(async () => {
  api = await subirApp()
})
beforeEach(async () => {
  await limparBanco()
  atendente = req(
    api.url,
    (await criaUsuarioTeste({ cargo: 'atendente' })).token
  )
  const tec = await criaUsuarioTeste({ cargo: 'tecnico' })
  tecnico = req(api.url, tec.token)
  nomeTecnico = tec.usuario.nome_usuario
  admin = req(api.url, (await criaUsuarioTeste({ cargo: 'admin' })).token)

  const cliente = await prisma.cliente.create({
    data: { nome_cliente: 'Maria', whatsapp_cliente: '5511999999999' },
  })
  const dispositivo = await prisma.dispositivo.create({
    data: {
      id_cliente: cliente.id_cliente,
      tipo: 'notebook',
      marca: 'Dell',
      modelo: 'Inspiron',
    },
  })
  base = {
    id_cliente: cliente.id_cliente.toString(),
    id_dispositivo: dispositivo.id_dispositivo.toString(),
    defeito_relatado: 'não liga',
    acessorios: 'carregador',
  }
})
after(async () => {
  await api.fechar()
  await prisma.$disconnect()
})

async function fichaAberta() {
  const { corpo } = await atendente.post('/fichas', base)
  return corpo.id_manutencao
}

test('atendente cria ficha aberta; técnico não cria', async () => {
  const { status, corpo } = await atendente.post('/fichas', base)
  assert.equal(status, 201)
  assert.equal(corpo.status, 'aberta')
  assert.equal((await tecnico.post('/fichas', base)).status, 403)
})

test('criação exige cliente, dispositivo e defeito', async () => {
  const { defeito_relatado, ...semDefeito } = base
  assert.equal((await atendente.post('/fichas', semDefeito)).status, 400)
  const outro = { ...base, id_cliente: 'abc' }
  assert.equal((await atendente.post('/fichas', outro)).status, 400)
})

test('listagem por status traz etapa_atual', async () => {
  await fichaAberta()
  const { status, corpo } = await tecnico.get('/fichas?status=aberta')
  assert.equal(status, 200)
  assert.equal(corpo.length, 1)
  assert.equal(corpo[0].etapa_atual.status, 'aberta')
  assert.equal(corpo[0].etapa_atual.expirado, false)
  const vazia = await tecnico.get('/fichas?status=em_analise')
  assert.equal(vazia.corpo.length, 0)
})

test('status inválido no filtro dá 400', async () => {
  assert.equal((await tecnico.get('/fichas?status=xyz')).status, 400)
})

test('técnico assume a ficha pelo PATCH de status', async () => {
  const id = await fichaAberta()
  const { status } = await tecnico.patch(`/fichas/${id}/status`, {
    status: 'em_analise',
  })
  assert.equal(status, 200)
  const { corpo } = await atendente.get(`/fichas/${id}`)
  assert.equal(corpo.tecnico.nome_usuario, nomeTecnico)
  assert.equal(corpo.eventos.length, 2)
  assert.equal(corpo.etapa_atual.status, 'em_analise')
  assert.equal(corpo.cliente.nome_cliente, 'Maria')
  assert.equal(corpo.atendente.senha_usuario, undefined)
})

test('PATCH de status com transição proibida dá 409', async () => {
  const id = await fichaAberta()
  const { status } = await admin.patch(`/fichas/${id}/status`, {
    status: 'consertado',
  })
  assert.equal(status, 409)
})

test('técnico responsável edita diagnóstico e valor em análise', async () => {
  const id = await fichaAberta()
  await tecnico.patch(`/fichas/${id}/status`, { status: 'em_analise' })
  const ok = await tecnico.put(`/fichas/${id}`, { valor_servico: '99.90' })
  assert.equal(ok.status, 200)
  assert.equal(Number(ok.corpo.valor_servico), 99.9)
  const atend = await atendente.put(`/fichas/${id}`, { valor_servico: '10' })
  assert.equal(atend.status, 403)
  const ruim = await tecnico.put(`/fichas/${id}`, { valor_servico: '-5' })
  assert.equal(ruim.status, 400)
})

test('técnico não edita valor fora de em_analise', async () => {
  const id = await fichaAberta()
  const { status } = await tecnico.put(`/fichas/${id}`, { valor_servico: '10' })
  assert.equal(status, 403)
})

test('atendente edita dados de entrada', async () => {
  const id = await fichaAberta()
  const { status, corpo } = await atendente.put(`/fichas/${id}`, {
    estado_entrada: 'arranhado',
  })
  assert.equal(status, 200)
  assert.equal(corpo.estado_entrada, 'arranhado')
})

test('PUT não muda status', async () => {
  const id = await fichaAberta()
  const { status } = await admin.put(`/fichas/${id}`, { status: 'consertado' })
  assert.equal(status, 400)
})

test('ficha finalizada não é editada', async () => {
  const id = await fichaAberta()
  await atendente.patch(`/fichas/${id}/status`, { status: 'cancelado' })
  const { status } = await atendente.put(`/fichas/${id}`, { observacao: 'x' })
  assert.equal(status, 409)
})

test('filtro expirada usa o prazo da etapa atual', async () => {
  const id = await fichaAberta()
  assert.equal((await admin.get('/fichas?expirada=true')).corpo.length, 0)
  await prisma.evento.updateMany({
    where: { id_manutencao: BigInt(id), saiu_em: null },
    data: { prazo_limite: new Date(Date.now() - 60e3) },
  })
  const atrasadas = await admin.get('/fichas?expirada=true')
  assert.equal(atrasadas.corpo.length, 1)
  assert.equal(atrasadas.corpo[0].etapa_atual.expirado, true)
  assert.equal((await admin.get('/fichas?expirada=false')).corpo.length, 0)
})

test('id inválido 400, inexistente 404, sem DELETE', async () => {
  assert.equal((await admin.get('/fichas/abc')).status, 400)
  assert.equal((await admin.get('/fichas/999')).status, 404)
  assert.equal((await admin.delete('/fichas/1')).status, 404)
})
