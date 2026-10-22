import prisma from '../database/connection.js'

export async function listarDispositivosDoCliente(id_cliente) {
  return prisma.dispositivo.findMany({
    where: { id_cliente },
    orderBy: { id_dispositivo: 'asc' },
  })
}

export async function criarDispositivo(dados) {
  return prisma.dispositivo.create({ data: dados })
}

export async function editarDispositivo(id_dispositivo, dados) {
  return prisma.dispositivo.update({ where: { id_dispositivo }, data: dados })
}
