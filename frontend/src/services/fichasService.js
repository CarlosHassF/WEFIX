import { requisicao, requisicaoPaginada } from './api.js'
import { criarDispositivo, garantirCliente } from './clientesService.js'
import { paraWhatsapp } from '../utils/statusFicha.js'

const API_URL = '/api/fichas'

export async function listarFichas(filtros = {}) {
  return requisicaoPaginada(API_URL, filtros)
}

export async function buscarFicha(id) {
  return requisicao(`${API_URL}/${id}`)
}

export async function criarFicha(dados) {
  return requisicao(API_URL, {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}

export async function registrarOrdem(dados) {
  const whatsapp_cliente = paraWhatsapp(dados.numero_cliente)
  const cliente = await garantirCliente({
    nome_cliente: dados.nome_cliente.trim(),
    whatsapp_cliente,
    email_cliente: (dados.email_cliente || '').trim(),
  })

  const dispositivo = await criarDispositivo(cliente.id_cliente, {
    tipo: dados.tipo,
    marca: dados.marca.trim(),
    modelo: dados.modelo.trim(),
    ...(dados.numero_serie?.trim() ? { numero_serie: dados.numero_serie.trim() } : {}),
  })

  const payload = {
    id_cliente: cliente.id_cliente,
    id_dispositivo: dispositivo.id_dispositivo,
    defeito_relatado: dados.defeito_relatado.trim(),
  }
  for (const campo of ['acessorios', 'estado_entrada', 'senha_dispositivo', 'observacao']) {
    const valor = (dados[campo] || '').trim()
    if (valor) payload[campo] = valor
  }

  return criarFicha(payload)
}

export async function atualizarFicha(id, dados) {
  const corpo = {}
  for (const campo of [
    'defeito_relatado',
    'acessorios',
    'estado_entrada',
    'senha_dispositivo',
    'observacao',
    'diagnostico',
  ]) {
    if (dados[campo] !== undefined) corpo[campo] = String(dados[campo]).trim()
  }
  if (dados.valor_servico !== undefined && dados.valor_servico !== '') {
    corpo.valor_servico = Number(dados.valor_servico).toFixed(2)
  }
  return requisicao(`${API_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(corpo),
  })
}

export async function atualizarStatusFicha(id, status, extras = {}) {
  const corpo = { status }
  if (extras.observacao !== undefined) corpo.observacao = extras.observacao
  if (extras.diagnostico !== undefined) corpo.diagnostico = extras.diagnostico
  if (extras.valor_servico !== undefined && extras.valor_servico !== '') {
    corpo.valor_servico = Number(extras.valor_servico).toFixed(2)
  }
  return requisicao(`${API_URL}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(corpo),
  })
}
