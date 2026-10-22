import { ErroHttp } from '../utils/erroHttp.js'

export const STATUS_FINAIS = ['consertado', 'cancelado']

// status que disparam webhook para o n8n ao serem alcancados
export const WEBHOOK_POR_STATUS = {
  em_espera: 'orcamento',
  consertado: 'retirada',
}

const TECNICO_RESPONSAVEL = { cargos: ['tecnico'], somenteResponsavel: true }
const ADMIN = { cargos: ['admin'] }

// unica fonte das transicoes permitidas (spec §4)
// ator: 'n8n' ou { cargos, somenteResponsavel }; exige: campos vindos de dados ou ja na ficha
export const TRANSICOES = [
  {
    de: 'aberta',
    para: 'em_analise',
    ator: { cargos: ['tecnico'] },
    exige: [],
  },
  {
    de: 'em_analise',
    para: 'em_espera',
    ator: TECNICO_RESPONSAVEL,
    exige: ['diagnostico', 'valor_servico'],
  },
  { de: 'em_espera', para: 'em_manutencao', ator: 'n8n', exige: [] },
  {
    de: 'em_espera',
    para: 'em_manutencao',
    ator: ADMIN,
    exige: ['observacao'],
  },
  {
    de: 'em_manutencao',
    para: 'em_aprovacao',
    ator: TECNICO_RESPONSAVEL,
    exige: [],
  },
  {
    de: 'em_aprovacao',
    para: 'em_manutencao',
    ator: ADMIN,
    exige: ['observacao'],
  },
  { de: 'em_aprovacao', para: 'consertado', ator: ADMIN, exige: [] },
  ...['aberta', 'em_analise', 'em_espera'].map((de) => ({
    de,
    para: 'cancelado',
    ator: { cargos: ['atendente', 'admin'] },
    exige: [],
  })),
  { de: 'em_espera', para: 'cancelado', ator: 'n8n', exige: [] },
]

function aceitaAtor(regra, ator, ficha) {
  if (regra.ator === 'n8n') return ator.tipo === 'n8n'
  if (ator.tipo !== 'usuario' || !regra.ator.cargos.includes(ator.cargo))
    return false
  return !regra.ator.somenteResponsavel || ficha.id_tecnico === ator.id
}

function vazio(valor) {
  return valor === undefined || valor === null || String(valor).trim() === ''
}

// lanca 409 (transicao inexistente), 403 (ator sem permissao) ou 400 (campo faltando)
export function validarTransicao({ ficha, para, ator, dados = {} }) {
  const regras = TRANSICOES.filter(
    (r) => r.de === ficha.status && r.para === para
  )
  if (regras.length === 0) {
    throw new ErroHttp(
      409,
      `Transição de ${ficha.status} para ${para} não permitida`
    )
  }

  const regra = regras.find((r) => aceitaAtor(r, ator, ficha))
  if (!regra) {
    throw new ErroHttp(403, 'Ação não permitida')
  }

  for (const campo of regra.exige) {
    if (vazio(dados[campo]) && vazio(ficha[campo])) {
      throw new ErroHttp(400, `${campo} é obrigatório`)
    }
  }
}
