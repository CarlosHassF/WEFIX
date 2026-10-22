import * as metricasRepository from '../repository/metricas.repository.js'
import { ErroHttp, paraBigInt } from '../utils/erroHttp.js'

// de/ate (YYYY-MM-DD, inclusivos) obrigatorios; id_tecnico opcional
function lerFiltros(query) {
  const { de, ate, id_tecnico } = query
  const data = /^\d{4}-\d{2}-\d{2}$/
  for (const [nome, valor] of [
    ['de', de],
    ['ate', ate],
  ]) {
    // ida e volta pela data rejeita dias inexistentes (ex.: 2026-02-30)
    if (
      !data.test(valor ?? '') ||
      new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) !== valor
    ) {
      throw new ErroHttp(400, `${nome} deve ser uma data YYYY-MM-DD`)
    }
  }
  if (de > ate) {
    throw new ErroHttp(400, 'de deve ser anterior ou igual a ate')
  }
  return {
    de,
    ate,
    id_tecnico:
      id_tecnico === undefined
        ? undefined
        : paraBigInt(id_tecnico, 'id_tecnico'),
  }
}

export async function concluidasPorDia(req, res) {
  res
    .status(200)
    .json(await metricasRepository.concluidasPorDia(lerFiltros(req.query)))
}

export async function tempoPorStatus(req, res) {
  res
    .status(200)
    .json(await metricasRepository.tempoPorStatus(lerFiltros(req.query)))
}

export async function tempoTotal(req, res) {
  res
    .status(200)
    .json(await metricasRepository.tempoTotal(lerFiltros(req.query)))
}

export async function prazos(req, res) {
  res.status(200).json(await metricasRepository.prazos(lerFiltros(req.query)))
}
