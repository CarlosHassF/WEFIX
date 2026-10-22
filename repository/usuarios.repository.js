import prisma from '../database/connection.js'

// campos devolvidos pela api (nunca o hash da senha)
const CAMPOS_PUBLICOS = {
  id_usuario: true,
  nome_usuario: true,
  email_usuario: true,
  cargo_usuario: true,
  ativo: true,
  created_at: true,
  updated_at: true,
}

export async function listarUsuarios() {
  return prisma.usuario.findMany({
    select: CAMPOS_PUBLICOS,
    orderBy: { id_usuario: 'asc' },
  })
}

export async function criarUsuario(dados) {
  return prisma.usuario.create({
    data: dados,
    select: CAMPOS_PUBLICOS,
  })
}

export async function editarUsuario(id_usuario, dados) {
  return prisma.usuario.update({
    data: dados,
    where: { id_usuario },
    select: CAMPOS_PUBLICOS,
  })
}

export async function alterarAtivo(id_usuario, ativo) {
  return prisma.usuario.update({
    data: { ativo },
    where: { id_usuario },
    select: CAMPOS_PUBLICOS,
  })
}

// usado no login: inclui o hash da senha
export async function buscarEmail(email_usuario) {
  return prisma.usuario.findUnique({
    where: { email_usuario },
  })
}

export async function buscarUsuarioPorId(id_usuario) {
  return prisma.usuario.findUnique({
    where: { id_usuario },
  })
}
