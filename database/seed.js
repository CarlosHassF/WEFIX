import bcrypt from 'bcrypt'
import { pathToFileURL } from 'node:url'

// prazos iniciais (horas corridas) por status nao-final; admin ajusta depois
export const PRAZOS_INICIAIS = {
  aberta: 4,
  em_analise: 24,
  em_espera: 48,
  em_manutencao: 72,
  em_aprovacao: 8,
}

// cria prazos faltantes sem sobrescrever os ja ajustados
export async function semearPrazos(prisma) {
  for (const [status, prazo_horas] of Object.entries(PRAZOS_INICIAIS)) {
    await prisma.prazoStatus.upsert({
      where: { status },
      update: {},
      create: { status, prazo_horas },
    })
  }
}

// garante o admin inicial (por email)
export async function semearAdmin(prisma, email, senha) {
  const senha_usuario = await bcrypt.hash(senha, 10)
  return prisma.usuario.upsert({
    where: { email_usuario: email },
    update: { senha_usuario, cargo_usuario: 'admin', ativo: true },
    create: {
      nome_usuario: 'Administrador',
      email_usuario: email,
      senha_usuario,
      cargo_usuario: 'admin',
    },
  })
}

// execucao direta: node database/seed.js (ou pnpm db:seed)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { default: prisma } = await import('./connection.js')
  const { ADMIN_EMAIL, ADMIN_SENHA } = process.env
  if (!ADMIN_EMAIL || !ADMIN_SENHA) {
    throw new Error('ADMIN_EMAIL e ADMIN_SENHA são obrigatórios no .env')
  }
  await semearPrazos(prisma)
  await semearAdmin(prisma, ADMIN_EMAIL, ADMIN_SENHA)
  await prisma.$disconnect()
  console.log('seed concluído')
}
