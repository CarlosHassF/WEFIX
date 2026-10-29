import prisma from '../database/connection.js'
import { ErroHttp } from '../utils/erroHttp.js'

const USUARIO_RESUMO = { select: { id_usuario: true, nome_usuario: true } }

// etapa em andamento (evento sem saida), com expiracao calculada agora
export function etapaAtual(eventos, agora = new Date()) {
  const aberto = eventos.find((e) => e.saiu_em === null)
  if (!aberto) return null
  return {
    status: aberto.status,
    entrou_em: aberto.entrou_em,
    prazo_limite: aberto.prazo_limite,
    expirado: aberto.prazo_limite !== null && agora > aberto.prazo_limite,
  }
}

export async function listarFichas({
  status,
  id_tecnico,
  id_cliente,
  expirada,
  skip,
  take,
}) {
  const agora = new Date()
  const atrasada = { saiu_em: null, prazo_limite: { lt: agora } }
  const where = { status, id_tecnico, id_cliente }
  if (expirada === true) where.eventos = { some: atrasada }
  if (expirada === false) where.eventos = { none: atrasada }

  const fichas = await prisma.ficha.findMany({
    where,
    include: {
      cliente: {
        select: { id_cliente: true, nome_cliente: true, whatsapp_cliente: true },
      },
      dispositivo: {
        select: { id_dispositivo: true, tipo: true, marca: true, modelo: true },
      },
      eventos: { where: { saiu_em: null } },
    },
    orderBy: { id_manutencao: 'desc' },
    skip,
    take,
  })
  return fichas.map(({ eventos, ...ficha }) => ({
    ...ficha,
    etapa_atual: etapaAtual(eventos, agora),
  }))
}

// ficha completa com historico de eventos
export async function buscarFichaPorId(id_manutencao) {
  const ficha = await prisma.ficha.findUnique({
    where: { id_manutencao },
    include: {
      cliente: true,
      dispositivo: true,
      atendente: USUARIO_RESUMO,
      tecnico: USUARIO_RESUMO,
      eventos: {
        include: { usuario: USUARIO_RESUMO },
        orderBy: { entrou_em: 'asc' },
      },
    },
  })
  if (!ficha) return null
  return { ...ficha, etapa_atual: etapaAtual(ficha.eventos) }
}

// edita dados da ficha; status so muda via mudarStatus
export async function editarFicha(id_manutencao, statusLido, dados) {
  // so edita se o status nao mudou desde a leitura que validou as regras
  const { count } = await prisma.ficha.updateMany({
    where: { id_manutencao, status: statusLido },
    data: dados,
  })
  if (count === 0) {
    throw new ErroHttp(409, 'Ficha alterada por outra requisição')
  }
  return prisma.ficha.findUnique({ where: { id_manutencao } })
}
