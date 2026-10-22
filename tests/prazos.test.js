import './helpers/env.js'
import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../database/connection.js'
import { limparBanco, criaUsuarioTeste } from './helpers/db.js'
import { subirApp, req } from './helpers/app.js'
import { criarFicha, mudarStatus } from '../services/fichaStatus.service.js'

let api
let admin

before(async () => {
  api = await subirApp()
})
beforeEach(async () => {
  await limparBanco()
  admin = req(api.url, (await criaUsuarioTeste({ cargo: 'admin' })).token)
})
after(async () => {
  await api.fechar()
  await prisma.$disconnect()
})

function duracaoHoras(evento) {
  return (evento.prazo_limite - evento.entrou_em) / 3600e3
}

test('admin lista os 5 prazos', async () => {
  const { status, corpo } = await admin.get('/prazos')
  assert.equal(status, 200)
  assert.equal(corpo.length, 5)
})

test('novo prazo vale só para eventos novos', async () => {
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
  const { usuario: atendente } = await criaUsuarioTeste({ cargo: 'atendente' })
  const { usuario: t } = await criaUsuarioTeste({ cargo: 'tecnico' })
  const tec = { tipo: 'usuario', id: t.id_usuario, cargo: 'tecnico' }
  const nova = async () =>
    (
      await criarFicha(
        {
          id_cliente: cliente.id_cliente,
          id_dispositivo: dispositivo.id_dispositivo,
          defeito_relatado: 'x',
        },
        atendente.id_usuario
      )
    ).id_manutencao

  const antiga = await nova()
  await mudarStatus(antiga, 'em_analise', tec)

  const { status } = await admin.put('/prazos/em_analise', { prazo_horas: 48 })
  assert.equal(status, 200)

  const recente = await nova()
  await mudarStatus(recente, 'em_analise', tec)

  const evento = (id) =>
    prisma.evento.findFirst({
      where: { id_manutencao: id, status: 'em_analise' },
    })
  assert.equal(duracaoHoras(await evento(antiga)), 24)
  assert.equal(duracaoHoras(await evento(recente)), 48)
})

test('status final ou inexistente não tem prazo', async () => {
  assert.equal(
    (await admin.put('/prazos/consertado', { prazo_horas: 5 })).status,
    400
  )
  assert.equal((await admin.put('/prazos/xyz', { prazo_horas: 5 })).status, 400)
})

test('prazo_horas inteiro entre 1 e 720', async () => {
  for (const prazo_horas of [0, 721, 1.5, '10']) {
    const { status } = await admin.put('/prazos/aberta', { prazo_horas })
    assert.equal(status, 400, `prazo_horas ${prazo_horas}`)
  }
})

test('técnico não acessa prazos', async () => {
  const tec = req(api.url, (await criaUsuarioTeste({ cargo: 'tecnico' })).token)
  assert.equal((await tec.get('/prazos')).status, 403)
})
