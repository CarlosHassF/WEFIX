import './helpers/env.js'
import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../database/connection.js'
import { limparBanco, criaUsuarioTeste } from './helpers/db.js'
import { criarFicha, mudarStatus } from '../services/fichaStatus.service.js'

let ctx

async function cenario() {
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
  const { usuario: tecnico } = await criaUsuarioTeste({ cargo: 'tecnico' })
  const { usuario: admin } = await criaUsuarioTeste({ cargo: 'admin' })
  const ator = (u) => ({
    tipo: 'usuario',
    id: u.id_usuario,
    cargo: u.cargo_usuario,
  })
  return {
    cliente,
    dispositivo,
    atendente,
    tec: ator(tecnico),
    admin: ator(admin),
    n8n: { tipo: 'n8n' },
    nova: () =>
      criarFicha(
        {
          id_cliente: cliente.id_cliente,
          id_dispositivo: dispositivo.id_dispositivo,
          defeito_relatado: 'tela quebrada',
        },
        atendente.id_usuario
      ),
  }
}

beforeEach(async () => {
  await limparBanco()
  ctx = await cenario()
})
after(() => prisma.$disconnect())

function eventosDe(id_manutencao) {
  return prisma.evento.findMany({
    where: { id_manutencao },
    orderBy: { id_evento: 'asc' },
  })
}

test('criarFicha cria ficha aberta com evento e prazo de 4h', async () => {
  const ficha = await ctx.nova()
  assert.equal(ficha.status, 'aberta')
  const eventos = await eventosDe(ficha.id_manutencao)
  assert.equal(eventos.length, 1)
  assert.equal(eventos[0].saiu_em, null)
  assert.equal(eventos[0].id_usuario, ctx.atendente.id_usuario)
  assert.equal(
    eventos[0].prazo_limite.getTime() - eventos[0].entrou_em.getTime(),
    4 * 3600e3
  )
})

test('criarFicha recusa dispositivo de outro cliente', async () => {
  const outro = await prisma.cliente.create({
    data: { nome_cliente: 'João', whatsapp_cliente: '5511888888888' },
  })
  await assert.rejects(
    criarFicha(
      {
        id_cliente: outro.id_cliente,
        id_dispositivo: ctx.dispositivo.id_dispositivo,
        defeito_relatado: 'x',
      },
      ctx.atendente.id_usuario
    ),
    { status: 400 }
  )
})

test('fluxo completo grava um evento por passagem', async () => {
  const { id_manutencao: id } = await ctx.nova()
  await mudarStatus(id, 'em_analise', ctx.tec)
  await mudarStatus(id, 'em_espera', ctx.tec, {
    diagnostico: 'trocar tela',
    valor_servico: '150',
  })
  await mudarStatus(id, 'em_manutencao', ctx.n8n)
  await mudarStatus(id, 'em_aprovacao', ctx.tec)
  await mudarStatus(id, 'em_manutencao', ctx.admin, { observacao: 'refazer' })
  await mudarStatus(id, 'em_aprovacao', ctx.tec)
  const final = await mudarStatus(id, 'consertado', ctx.admin)

  assert.equal(final.status, 'consertado')
  assert.equal(final.id_tecnico, ctx.tec.id)
  assert.equal(final.valor_servico.toString(), '150')
  assert.ok(final.finalizada_em instanceof Date)

  const eventos = await eventosDe(id)
  assert.equal(eventos.length, 8)
  assert.deepEqual(
    eventos.map((e) => e.saiu_em === null),
    [false, false, false, false, false, false, false, true]
  )
  assert.equal(eventos[3].origem, 'n8n')
  assert.equal(eventos[3].id_usuario, null)
  assert.equal(eventos[5].origem, 'usuario')
  assert.equal(eventos[5].observacao, 'refazer')
  assert.equal(eventos[7].prazo_limite, null)
})

test('evento fechado depois do prazo fica expirado', async () => {
  const { id_manutencao: id } = await ctx.nova()
  await prisma.evento.updateMany({
    where: { id_manutencao: id, saiu_em: null },
    data: { prazo_limite: new Date(Date.now() - 60e3) },
  })
  await mudarStatus(id, 'em_analise', ctx.tec)
  const [aberta, analise] = await eventosDe(id)
  assert.equal(aberta.expirado, true)
  assert.equal(analise.expirado, false)
})

test('valor_servico inválido dá 400', async () => {
  const { id_manutencao: id } = await ctx.nova()
  await mudarStatus(id, 'em_analise', ctx.tec)
  for (const valor_servico of ['-1', '12.345', 'abc']) {
    await assert.rejects(
      mudarStatus(id, 'em_espera', ctx.tec, {
        diagnostico: 'x',
        valor_servico,
      }),
      { status: 400 }
    )
  }
})

test('mudanças simultâneas: uma vence, outra recebe 409', async () => {
  const { id_manutencao: id } = await ctx.nova()
  const resultados = await Promise.allSettled([
    mudarStatus(id, 'em_analise', ctx.tec),
    mudarStatus(id, 'em_analise', ctx.tec),
  ])
  assert.equal(resultados.filter((r) => r.status === 'fulfilled').length, 1)
  const rejeitado = resultados.find((r) => r.status === 'rejected')
  assert.equal(rejeitado.reason.status, 409)
  assert.equal(await prisma.evento.count({ where: { saiu_em: null } }), 1)
})

test('ficha inexistente dá 404', async () => {
  await assert.rejects(mudarStatus(999n, 'em_analise', ctx.tec), {
    status: 404,
  })
})
