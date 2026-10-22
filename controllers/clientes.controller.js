import * as clientesRepository from '../repository/clientes.repository.js'
import { ErroHttp, paraBigInt } from '../utils/erroHttp.js'
import { validaTexto } from '../utils/validacao.js'
import { paginacao } from '../utils/paginacao.js'

// valida campos de cliente; na criacao nome e whatsapp sao obrigatorios
function dadosCliente(body, { criacao }) {
  const nome_cliente = validaTexto(body.nome_cliente, 'nome_cliente', 100)
  const whatsapp_cliente = body.whatsapp_cliente
  const email_cliente = validaTexto(body.email_cliente, 'email_cliente', 100)

  if (criacao && (!nome_cliente || !whatsapp_cliente)) {
    throw new ErroHttp(400, 'nome_cliente e whatsapp_cliente são obrigatórios')
  }
  // so digitos com DDI e DDD (formato usado pelo n8n), ex.: 5511999999999
  if (
    whatsapp_cliente !== undefined &&
    !/^\d{12,13}$/.test(String(whatsapp_cliente))
  ) {
    throw new ErroHttp(
      400,
      'whatsapp_cliente deve ter só dígitos com DDI e DDD'
    )
  }
  return { nome_cliente, whatsapp_cliente, email_cliente }
}

export async function listaClientes(req, res) {
  const busca = validaTexto(req.query.busca, 'busca', 100)
  const clientes = await clientesRepository.listarClientes({
    busca,
    ...paginacao(req.query),
  })
  res.status(200).json(clientes)
}

export async function buscaCliente(req, res) {
  const id_cliente = paraBigInt(req.params.id_cliente, 'id_cliente')
  const cliente = await clientesRepository.buscarClientePorId(id_cliente)
  if (!cliente) {
    throw new ErroHttp(404, 'Cliente não encontrado')
  }
  res.status(200).json(cliente)
}

export async function criaCliente(req, res) {
  const dados = dadosCliente(req.body ?? {}, { criacao: true })
  res.status(201).json(await clientesRepository.criarCliente(dados))
}

export async function editaCliente(req, res) {
  const id_cliente = paraBigInt(req.params.id_cliente, 'id_cliente')
  const dados = dadosCliente(req.body ?? {}, { criacao: false })
  res
    .status(200)
    .json(await clientesRepository.editarCliente(id_cliente, dados))
}
