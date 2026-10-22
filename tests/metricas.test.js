import './helpers/env.js'
import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../database/connection.js'
import { limparBanco, criaUsuarioTeste } from './helpers/db.js'
import { subirApp, req } from './helpers/app.js'

let api
let admin
let base
let tecA
let tecB

const periodo = '?de=2026-10-10&ate=2026-10-10'

before(async () => {
  api = await subirApp()
})
beforeEach(async () => {
  await limparBanco()
  admin = req(api.url, (await criaUsuarioTeste({ cargo: 'admin' })).token)
  const { usuario: atendente } = await criaUsuarioTeste({ cargo: 'atendente' })
  tecA = (await criaUsuarioTeste({ cargo: 'tecnico' })).usuario
  tecB = (await criaUsuarioTeste({ cargo: 'tecnico' })).usuario
  const cliente = await prisma.cliente.create({
    data: { nome_cliente: 'M', whatsapp_cliente: '5511999999999' },
  })
  const dispositivo = await prisma.dispositivo.create({
    data: {
      id_cliente: cliente.id_cliente,
      tipo: 'outro',
      marca: 'X',
      modelo: 'Y',
    },
  })
  base = {
    id_cliente: cliente.id_cliente,
    id_dispositivo: dispositivo.id_dispositivo,
    id_atendente: atendente.id_usuario,
    defeito_relatado: 'x',
  }
})
after(async () => {
  await api.fechar()
  await prisma.$disconnect()
})

// ficha montada direto no banco com datas fixas
function ficha(tecnico, status, criada, finalizada) {
  return prisma.ficha.create({
    data: {
      ...base,
      id_tecnico: tecnico?.id_usuario ?? null,
      status,
      created_at: new Date(criada),
      finalizada_em: finalizada ? new Date(finalizada) : null,
    },
  })
}

function evento(f, status, entrou, saiu, extra = {}) {
  return prisma.evento.create({
    data: {
      id_manutencao: f.id_manutencao,
      status,
      origem: 'usuario',
      entrou_em: new Date(entrou),
      saiu_em: saiu ? new Date(saiu) : null,
      ...extra,
    },
  })
}

test('concluídas por dia no fuso de São Paulo', async () => {
  await ficha(tecA, 'consertado', '2026-10-09T12:00Z', '2026-10-10T15:00Z')
  await ficha(tecA, 'consertado', '2026-10-09T12:00Z', '2026-10-10T16:00Z')
  await ficha(tecA, 'cancelado', '2026-10-09T12:00Z', '2026-10-10T17:00Z')
  // 23:30 do dia 10 em SP (dia 11 em UTC): conta
  await ficha(tecB, 'consertado', '2026-10-09T12:00Z', '2026-10-11T02:30Z')
  // 00:30 do dia 11 em SP: fica fora
  await ficha(tecB, 'consertado', '2026-10-09T12:00Z', '2026-10-11T03:30Z')

  const { status, corpo } = await admin.get(
    `/metricas/concluidas-por-dia${periodo}`
  )
  assert.equal(status, 200)
  assert.deepEqual(corpo.total, [
    { dia: '2026-10-10', consertadas: 3, canceladas: 1 },
  ])
  const porTec = Object.fromEntries(
    corpo.por_tecnico.map((l) => [l.id_tecnico, l])
  )
  assert.equal(porTec[tecA.id_usuario.toString()].consertadas, 2)
  assert.equal(porTec[tecA.id_usuario.toString()].canceladas, 1)
  assert.equal(porTec[tecB.id_usuario.toString()].consertadas, 1)

  const soB = await admin.get(
    `/metricas/concluidas-por-dia${periodo}&id_tecnico=${tecB.id_usuario}`
  )
  assert.deepEqual(soB.corpo.total, [
    { dia: '2026-10-10', consertadas: 1, canceladas: 0 },
  ])
})

test('tempo por status soma as passagens da mesma ficha', async () => {
  const f = await ficha(tecA, 'em_aprovacao', '2026-10-10T10:00Z')
  await evento(f, 'em_manutencao', '2026-10-10T10:00Z', '2026-10-10T12:00Z')
  await evento(f, 'em_aprovacao', '2026-10-10T12:00Z', '2026-10-10T13:00Z')
  await evento(f, 'em_manutencao', '2026-10-10T13:00Z', '2026-10-10T16:00Z')
  await evento(f, 'em_aprovacao', '2026-10-10T16:00Z', null)

  const { corpo } = await admin.get(`/metricas/tempo-por-status${periodo}`)
  const manutencao = corpo.find((l) => l.status === 'em_manutencao')
  assert.deepEqual(manutencao, {
    status: 'em_manutencao',
    fichas: 1,
    media_horas: 5,
    mediana_horas: 5,
    max_horas: 5,
  })
  assert.equal(corpo.find((l) => l.status === 'em_aprovacao').max_horas, 1)
})

test('tempo total da abertura ao conserto', async () => {
  // 10:00 às 22:00 em SP
  await ficha(tecA, 'consertado', '2026-10-10T13:00Z', '2026-10-11T01:00Z')
  await ficha(tecA, 'cancelado', '2026-10-10T13:00Z', '2026-10-10T14:00Z')

  const { corpo } = await admin.get(`/metricas/tempo-total${periodo}`)
  assert.deepEqual(corpo.total, {
    fichas: 1,
    media_horas: 12,
    mediana_horas: 12,
  })
  assert.equal(corpo.por_tecnico.length, 1)
  assert.equal(corpo.por_tecnico[0].media_horas, 12)
  assert.equal(corpo.por_tecnico[0].nome_tecnico, tecA.nome_usuario)
})

test('prazos estourados: fechados e etapa atual', async () => {
  const f1 = await ficha(tecA, 'em_analise', '2026-10-10T10:00Z')
  await evento(f1, 'aberta', '2026-10-10T10:00Z', '2026-10-10T20:00Z', {
    prazo_limite: new Date('2026-10-10T14:00Z'),
    expirado: true,
  })
  await evento(f1, 'em_analise', '2026-10-10T20:00Z', null, {
    prazo_limite: new Date('2099-01-01T00:00Z'),
  })
  const f2 = await ficha(null, 'aberta', '2026-10-10T10:00Z')
  await evento(f2, 'aberta', '2026-10-10T10:00Z', null, {
    prazo_limite: new Date('2026-10-10T14:00Z'),
  })

  const { status, corpo } = await admin.get(`/metricas/prazos${periodo}`)
  assert.equal(status, 200)
  const aberta = corpo.por_status.find((l) => l.status === 'aberta')
  assert.deepEqual(aberta, {
    status: 'aberta',
    eventos: 2,
    expirados: 2,
    percentual: 100,
  })
  assert.equal(corpo.por_tecnico.length, 1)
  assert.equal(corpo.por_tecnico[0].expirados, 1)
  assert.equal(corpo.fichas_atrasadas.length, 1)
  assert.equal(
    corpo.fichas_atrasadas[0].id_manutencao,
    f2.id_manutencao.toString()
  )
})

test('período obrigatório e válido; só admin', async () => {
  assert.equal((await admin.get('/metricas/tempo-total')).status, 400)
  assert.equal(
    (await admin.get('/metricas/tempo-total?de=2026-10-11&ate=2026-10-10'))
      .status,
    400
  )
  assert.equal(
    (await admin.get('/metricas/tempo-total?de=ontem&ate=2026-10-10')).status,
    400
  )
  assert.equal(
    (await admin.get('/metricas/tempo-total?de=2026-02-30&ate=2026-03-01'))
      .status,
    400
  )
  const tec = req(api.url, (await criaUsuarioTeste({ cargo: 'tecnico' })).token)
  assert.equal((await tec.get(`/metricas/tempo-total${periodo}`)).status, 403)
})
