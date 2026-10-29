import prisma from '../database/connection.js'

export async function listarClientes({ busca, skip, take }) {
  return prisma.cliente.findMany({
    where: busca
      ? {
          OR: [
            { nome_cliente: { contains: busca, mode: 'insensitive' } },
            { whatsapp_cliente: { contains: busca } },
            { email_cliente: { contains: busca, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { nome_cliente: 'asc' },
    skip,
    take,
  })
}

// cliente com seus aparelhos e o resumo das fichas
export async function buscarClientePorId(id_cliente) {
  return prisma.cliente.findUnique({
    where: { id_cliente },
    include: {
      dispositivos: { orderBy: { id_dispositivo: 'asc' } },
      fichas: {
        select: { id_manutencao: true, status: true, created_at: true },
        orderBy: { id_manutencao: 'desc' },
      },
    },
  })
}

export async function criarCliente(dados) {
  return prisma.cliente.create({ data: dados })
}

export async function editarCliente(id_cliente, dados) {
  return prisma.cliente.update({ where: { id_cliente }, data: dados })
}
