import prisma from '../database/connection.js'
import { ErroHttp } from '../utils/erroHttp.js'
import { validaValor } from '../utils/validacao.js'
import {
  validarTransicao,
  STATUS_FINAIS,
  WEBHOOK_POR_STATUS,
} from './transicoes.js'
import { notificar } from './n8n.service.js'

// prazo limite do status a partir de agora; null se o status nao tem prazo
async function prazoLimite(tx, status, agora) {
  const prazo = await tx.prazoStatus.findUnique({ where: { status } })
  return prazo ? new Date(agora.getTime() + prazo.prazo_horas * 3600e3) : null
}

// cria a ficha 'aberta' e seu primeiro evento na mesma transacao
export async function criarFicha(dados, id_atendente) {
  const dispositivo = await prisma.dispositivo.findUnique({
    where: { id_dispositivo: dados.id_dispositivo },
  })
  if (!dispositivo || dispositivo.id_cliente !== dados.id_cliente) {
    throw new ErroHttp(400, 'Dispositivo não pertence ao cliente')
  }

  return prisma.$transaction(async (tx) => {
    const agora = new Date()
    const ficha = await tx.ficha.create({
      data: { ...dados, id_atendente, status: 'aberta' },
    })
    await tx.evento.create({
      data: {
        id_manutencao: ficha.id_manutencao,
        status: 'aberta',
        origem: 'usuario',
        id_usuario: id_atendente,
        entrou_em: agora,
        prazo_limite: await prazoLimite(tx, 'aberta', agora),
      },
    })
    return ficha
  })
}

// unico caminho de mudanca de status (spec §6)
// ator: { tipo: 'usuario', id, cargo } | { tipo: 'n8n' }
export async function mudarStatus(id_manutencao, para, ator, dados = {}) {
  const ficha = await prisma.ficha.findUnique({ where: { id_manutencao } })
  if (!ficha) {
    throw new ErroHttp(404, 'Ficha não encontrada')
  }

  validarTransicao({ ficha, para, ator, dados })
  const valor_servico =
    dados.valor_servico === undefined
      ? undefined
      : validaValor(dados.valor_servico)
  // diagnostico em branco nao apaga o ja registrado
  const diagnostico = dados.diagnostico?.trim() || undefined

  const atualizada = await prisma.$transaction(async (tx) => {
    const agora = new Date()
    const data = { status: para }
    if (diagnostico !== undefined) data.diagnostico = diagnostico
    if (valor_servico !== undefined) data.valor_servico = valor_servico
    if (para === 'em_analise') data.id_tecnico = ator.id
    if (STATUS_FINAIS.includes(para)) data.finalizada_em = agora

    // so atualiza se ninguem mudou o status desde a leitura
    const { count } = await tx.ficha.updateMany({
      where: { id_manutencao, status: ficha.status },
      data,
    })
    if (count === 0) {
      throw new ErroHttp(409, 'Ficha alterada por outra requisição')
    }

    const aberto = await tx.evento.findFirst({
      where: { id_manutencao, saiu_em: null },
    })
    if (aberto) {
      await tx.evento.update({
        where: { id_evento: aberto.id_evento },
        data: {
          saiu_em: agora,
          expirado: aberto.prazo_limite !== null && agora > aberto.prazo_limite,
        },
      })
    }

    await tx.evento.create({
      data: {
        id_manutencao,
        status: para,
        origem: ator.tipo === 'n8n' ? 'n8n' : 'usuario',
        id_usuario: ator.tipo === 'n8n' ? null : ator.id,
        observacao: dados.observacao,
        entrou_em: agora,
        prazo_limite: await prazoLimite(tx, para, agora),
      },
    })

    return tx.ficha.findUnique({ where: { id_manutencao } })
  })

  if (WEBHOOK_POR_STATUS[para]) {
    await notificar(WEBHOOK_POR_STATUS[para], id_manutencao)
  }
  return atualizada
}
