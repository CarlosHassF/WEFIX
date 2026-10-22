import prisma from '../database/connection.js'

export async function listarPrazos() {
  return prisma.prazoStatus.findMany({ orderBy: { status: 'asc' } })
}

// eventos ja abertos guardam seu prazo_limite; a mudanca vale para os proximos
export async function salvarPrazo(status, prazo_horas) {
  return prisma.prazoStatus.upsert({
    where: { status },
    update: { prazo_horas },
    create: { status, prazo_horas },
  })
}
