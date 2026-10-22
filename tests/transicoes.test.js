import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarTransicao } from '../services/transicoes.js'
import { paraBigInt } from '../utils/erroHttp.js'

const tec = { tipo: 'usuario', id: 7n, cargo: 'tecnico' }
const outroTec = { ...tec, id: 8n }
const admin = { tipo: 'usuario', id: 1n, cargo: 'admin' }
const atendente = { tipo: 'usuario', id: 2n, cargo: 'atendente' }
const n8n = { tipo: 'n8n' }

function ficha(status) {
  return { status, id_tecnico: 7n, diagnostico: null, valor_servico: null }
}

function permite(status, para, ator, dados) {
  assert.doesNotThrow(() =>
    validarTransicao({ ficha: ficha(status), para, ator, dados })
  )
}

function recusa(status, para, ator, dados, codigo) {
  assert.throws(
    () => validarTransicao({ ficha: ficha(status), para, ator, dados }),
    { status: codigo }
  )
}

test('técnico assume ficha aberta, atendente não', () => {
  permite('aberta', 'em_analise', tec)
  recusa('aberta', 'em_analise', atendente, {}, 403)
})

test('em_analise -> em_espera exige diagnóstico, valor e técnico responsável', () => {
  const dados = { diagnostico: 'tela', valor_servico: '150.00' }
  permite('em_analise', 'em_espera', tec, dados)
  recusa('em_analise', 'em_espera', tec, { diagnostico: 'tela' }, 400)
  recusa('em_analise', 'em_espera', outroTec, dados, 403)
})

test('campos exigidos podem já estar na ficha', () => {
  const f = {
    ...ficha('em_analise'),
    diagnostico: 'tela',
    valor_servico: '10.00',
  }
  assert.doesNotThrow(() =>
    validarTransicao({ ficha: f, para: 'em_espera', ator: tec })
  )
})

test('em_espera -> em_manutencao: n8n livre, admin com observação', () => {
  permite('em_espera', 'em_manutencao', n8n)
  recusa('em_espera', 'em_manutencao', admin, {}, 400)
  permite('em_espera', 'em_manutencao', admin, {
    observacao: 'aprovou por telefone',
  })
  recusa('em_espera', 'em_manutencao', tec, {}, 403)
})

test('reprovação do admin exige observação', () => {
  recusa('em_aprovacao', 'em_manutencao', admin, {}, 400)
  permite('em_aprovacao', 'em_manutencao', admin, { observacao: 'refazer' })
})

test('cancelamento só antes da manutenção', () => {
  recusa('em_manutencao', 'cancelado', admin, {}, 409)
  permite('aberta', 'cancelado', atendente)
  permite('em_analise', 'cancelado', admin)
  permite('em_espera', 'cancelado', n8n)
  permite('em_espera', 'cancelado', atendente)
})

test('status final não muda', () => {
  recusa('consertado', 'em_manutencao', admin, { observacao: 'x' }, 409)
})

test('paraBigInt aceita só inteiros positivos', () => {
  assert.equal(paraBigInt('12'), 12n)
  assert.equal(paraBigInt(3), 3n)
  for (const v of [
    'abc',
    '1.5',
    '0',
    '',
    undefined,
    -1,
    '99999999999999999999',
  ]) {
    assert.throws(() => paraBigInt(v), { status: 400 })
  }
})
