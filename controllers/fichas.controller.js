import * as fichasRepository from '../repository/fichas.repository.js'
import { criarFicha, mudarStatus } from '../services/fichaStatus.service.js'
import { STATUS_FINAIS } from '../services/transicoes.js'
import { ErroHttp, paraBigInt } from '../utils/erroHttp.js'
import { validaTexto, validaValor } from '../utils/validacao.js'
import { paginacao } from '../utils/paginacao.js'

const STATUS = [
  'aberta',
  'em_analise',
  'em_espera',
  'em_manutencao',
  'em_aprovacao',
  'consertado',
  'cancelado',
]

// campos de entrada do aparelho (atendente/admin) e seus tamanhos
const CAMPOS_ENTRADA = {
  defeito_relatado: 400,
  acessorios: 200,
  estado_entrada: 400,
  senha_dispositivo: 100,
  observacao: 400,
}

function lerEntrada(body) {
  const dados = {}
  for (const [campo, max] of Object.entries(CAMPOS_ENTRADA)) {
    const valor = validaTexto(body[campo], campo, max)
    if (valor !== undefined) dados[campo] = valor
  }
  return dados
}

async function fichaExistente(id_manutencao) {
  const ficha = await fichasRepository.buscarFichaPorId(id_manutencao)
  if (!ficha) {
    throw new ErroHttp(404, 'Ficha não encontrada')
  }
  return ficha
}

export async function listaFichas(req, res) {
  const { status, id_tecnico, id_cliente, expirada } = req.query
  if (status !== undefined && !STATUS.includes(status)) {
    throw new ErroHttp(400, 'status inválido')
  }
  if (expirada !== undefined && !['true', 'false'].includes(expirada)) {
    throw new ErroHttp(400, 'expirada deve ser true ou false')
  }

  const fichas = await fichasRepository.listarFichas({
    status,
    id_tecnico:
      id_tecnico === undefined
        ? undefined
        : paraBigInt(id_tecnico, 'id_tecnico'),
    id_cliente:
      id_cliente === undefined
        ? undefined
        : paraBigInt(id_cliente, 'id_cliente'),
    expirada: expirada === undefined ? undefined : expirada === 'true',
    ...paginacao(req.query),
  })
  res.status(200).json(fichas)
}

export async function buscaFicha(req, res) {
  const id = paraBigInt(req.params.id_manutencao, 'id_manutencao')
  res.status(200).json(await fichaExistente(id))
}

export async function criaFicha(req, res) {
  const body = req.body ?? {}
  const dados = lerEntrada(body)
  if (!dados.defeito_relatado) {
    throw new ErroHttp(400, 'defeito_relatado é obrigatório')
  }

  const ficha = await criarFicha(
    {
      ...dados,
      id_cliente: paraBigInt(body.id_cliente, 'id_cliente'),
      id_dispositivo: paraBigInt(body.id_dispositivo, 'id_dispositivo'),
    },
    req.usuario.id
  )
  res.status(201).json(ficha)
}

// edicao de dados (spec §7): entrada por atendente/admin; diagnostico/valor pelo tecnico responsavel em analise
export async function alteraFicha(req, res) {
  const id = paraBigInt(req.params.id_manutencao, 'id_manutencao')
  const body = req.body ?? {}

  if (body.status !== undefined) {
    throw new ErroHttp(
      400,
      'Use PATCH /fichas/:id_manutencao/status para mudar o status'
    )
  }

  const ficha = await fichaExistente(id)
  if (STATUS_FINAIS.includes(ficha.status)) {
    throw new ErroHttp(409, 'Ficha finalizada não pode ser editada')
  }

  const { cargo, id: id_usuario } = req.usuario
  const dados = lerEntrada(body)
  if (
    Object.keys(dados).length > 0 &&
    !['atendente', 'admin'].includes(cargo)
  ) {
    throw new ErroHttp(403, 'Ação não permitida')
  }

  const diagnostico = validaTexto(body.diagnostico, 'diagnostico', 1000)
  const valor_servico =
    body.valor_servico === undefined
      ? undefined
      : validaValor(body.valor_servico)
  if (diagnostico !== undefined || valor_servico !== undefined) {
    const responsavel =
      cargo === 'tecnico' &&
      ficha.id_tecnico === id_usuario &&
      ficha.status === 'em_analise'
    if (!responsavel) {
      throw new ErroHttp(403, 'Ação não permitida')
    }
    if (diagnostico !== undefined) dados.diagnostico = diagnostico
    if (valor_servico !== undefined) dados.valor_servico = valor_servico
  }

  res
    .status(200)
    .json(await fichasRepository.editarFicha(id, ficha.status, dados))
}

export async function alteraStatus(req, res) {
  const id = paraBigInt(req.params.id_manutencao, 'id_manutencao')
  const { status, observacao, diagnostico, valor_servico } = req.body ?? {}
  if (!STATUS.includes(status)) {
    throw new ErroHttp(400, 'status inválido')
  }

  const ficha = await mudarStatus(
    id,
    status,
    { tipo: 'usuario', id: req.usuario.id, cargo: req.usuario.cargo },
    {
      observacao: validaTexto(observacao, 'observacao', 400),
      diagnostico: validaTexto(diagnostico, 'diagnostico', 1000),
      valor_servico,
    }
  )
  res.status(200).json(ficha)
}
