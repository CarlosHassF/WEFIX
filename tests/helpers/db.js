import jwt from 'jsonwebtoken'
import prisma from '../../database/connection.js'
import { semearPrazos } from '../../database/seed.js'

let sequencia = 0

// zera todas as tabelas e recria os prazos padrao
export async function limparBanco() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Evento", "Ficha", "Dispositivo", "Cliente", "Usuario", "PrazoStatus" RESTART IDENTITY CASCADE'
  )
  await semearPrazos(prisma)
}

// cria usuario com senha 'senha123' e devolve token igual ao do login
export async function criaUsuarioTeste({ cargo, ativo = true, email }) {
  sequencia += 1
  const usuario = await prisma.usuario.create({
    data: {
      nome_usuario: `${cargo} ${sequencia}`,
      email_usuario: email ?? `${cargo}${sequencia}@wefix.test`,
      // hash bcrypt de 'senha123'
      senha_usuario:
        '$2b$10$tOzg8UKaPtMKsuhc14LMl.BsnXOQC28Y8hSfYBvTB7R1lYhCZg02q',
      cargo_usuario: cargo,
      ativo,
    },
  })
  const token = jwt.sign(
    {
      id: usuario.id_usuario.toString(),
      nome: usuario.nome_usuario,
      cargo: usuario.cargo_usuario,
      is_logged: true,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )
  return { usuario, token }
}
