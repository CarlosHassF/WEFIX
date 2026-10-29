export const STATUS_LABELS = {
  aberta: 'Aberta',
  em_analise: 'Em análise',
  em_espera: 'Aguardando orçamento',
  em_manutencao: 'Em manutenção',
  em_aprovacao: 'Em aprovação',
  consertado: 'Consertado',
  cancelado: 'Cancelado',
}

export const COLUNAS_KANBAN = Object.entries(STATUS_LABELS).map(([status, titulo]) => ({
  status,
  titulo,
}))

export const STATUS_FINAIS = ['consertado', 'cancelado']

export const TIPOS_DISPOSITIVO = [
  'notebook',
  'desktop',
  'celular',
  'tablet',
  'impressora',
  'outro',
]

export const TRANSICOES = [
  { de: 'aberta', para: 'em_analise', cargos: ['tecnico'], exige: [] },
  {
    de: 'em_analise',
    para: 'em_espera',
    cargos: ['tecnico'],
    somenteResponsavel: true,
    exige: ['diagnostico', 'valor_servico'],
  },
  { de: 'em_espera', para: 'em_manutencao', cargos: ['admin'], exige: ['observacao'] },
  {
    de: 'em_manutencao',
    para: 'em_aprovacao',
    cargos: ['tecnico'],
    somenteResponsavel: true,
    exige: [],
  },
  { de: 'em_aprovacao', para: 'em_manutencao', cargos: ['admin'], exige: ['observacao'] },
  { de: 'em_aprovacao', para: 'consertado', cargos: ['admin'], exige: [] },
  { de: 'aberta', para: 'cancelado', cargos: ['atendente', 'admin'], exige: [] },
  { de: 'em_analise', para: 'cancelado', cargos: ['atendente', 'admin'], exige: [] },
  { de: 'em_espera', para: 'cancelado', cargos: ['atendente', 'admin'], exige: [] },
]

export function rotuloAcao(regra) {
  if (regra.para === 'em_analise') return 'Assumir'
  if (regra.para === 'em_espera') return 'Enviar orçamento'
  if (regra.de === 'em_espera' && regra.para === 'em_manutencao') return 'Aprovar (manual)'
  if (regra.de === 'em_aprovacao' && regra.para === 'em_manutencao') return 'Reprovar serviço'
  if (regra.para === 'em_aprovacao') return 'Serviço pronto'
  if (regra.para === 'consertado') return 'Concluir'
  if (regra.para === 'cancelado') return 'Cancelar'
  return STATUS_LABELS[regra.para]
}

export function transicoesDoUsuario(ficha, usuario) {
  if (!ficha || !usuario || STATUS_FINAIS.includes(ficha.status)) return []
  return TRANSICOES.filter((regra) => {
    if (regra.de !== ficha.status) return false
    if (!regra.cargos.includes(usuario.cargo)) return false
    if (regra.somenteResponsavel && String(ficha.id_tecnico) !== String(usuario.id)) {
      return false
    }
    return true
  })
}

export function nomeCliente(ficha) {
  return ficha?.cliente?.nome_cliente || 'Cliente não informado'
}

export function telefoneCliente(ficha) {
  return ficha?.cliente?.whatsapp_cliente || ''
}

export function descricaoDispositivo(ficha) {
  const dispositivo = ficha?.dispositivo
  if (!dispositivo) return 'Dispositivo não informado'
  return [dispositivo.tipo, dispositivo.marca, dispositivo.modelo].filter(Boolean).join(' ')
}

export function formatarValor(valor) {
  if (valor == null || valor === '') return 'Não informado'
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function paraWhatsapp(telefone) {
  const digitos = String(telefone || '').replace(/\D/g, '')
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    return digitos
  }
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`
  return digitos
}

export function formatarTelefone(whatsapp) {
  const digitos = String(whatsapp || '').replace(/\D/g, '')
  const local = digitos.startsWith('55') ? digitos.slice(2) : digitos
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  }
  return whatsapp || '—'
}
