import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

import * as usuariosRepository from '../repository/usuarios.repository.js'
import { ErroHttp } from '../utils/erroHttp.js'

export async function login(req, res) {
  const { email_usuario, senha } = req.body ?? {}

  if (!email_usuario || !senha) {
    throw new ErroHttp(400, 'Email e senha são obrigatorios')
  }

  const usuario = await usuariosRepository.buscarEmail(email_usuario)

  // usuario inexistente, desativado ou senha errada recebem a mesma resposta
  if (
    !usuario ||
    !usuario.ativo ||
    !(await bcrypt.compare(senha, usuario.senha_usuario))
  ) {
    throw new ErroHttp(401, 'Credenciais invalidas')
  }

  //gera o token com id, nome e cargo
  const token = jwt.sign(
    {
      id: usuario.id_usuario.toString(),
      nome: usuario.nome_usuario,
      cargo: usuario.cargo_usuario,
      is_logged: true,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  )
  res.status(200).json({ token })
}
