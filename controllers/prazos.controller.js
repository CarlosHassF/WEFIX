import * as prazosRepository from '../repository/prazos.repository.js'
import { ErroHttp } from '../utils/erroHttp.js'

const STATUS_COM_PRAZO = [
  'aberta',
  'em_analise',
  'em_espera',
  'em_manutencao',
  'em_aprovacao',
]

export async function listaPrazos(req, res) {
  res.status(200).json(await prazosRepository.listarPrazos())
}

export async function alteraPrazo(req, res) {
  const { status } = req.params
  const { prazo_horas } = req.body ?? {}

  if (!STATUS_COM_PRAZO.includes(status)) {
    throw new ErroHttp(400, 'status sem prazo')
  }
  // DECISAO: limite do prazo — escolhido: inteiro de 1 a 720 horas (30 dias); alternativas: sem teto, minutos
  if (!Number.isInteger(prazo_horas) || prazo_horas < 1 || prazo_horas > 720) {
    throw new ErroHttp(400, 'prazo_horas deve ser inteiro entre 1 e 720')
  }

  res.status(200).json(await prazosRepository.salvarPrazo(status, prazo_horas))
}
