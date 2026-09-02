import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

import * as usuariosRepository from '../repository/usuarios.repository.js'

export async function login(req, res) {
  try {
    const { email_usuario, senha } = req.body

    if (!email_usuario || !senha) {
      return res.status(400).send({ erro: 'Email e senha são obrigatorios' })
    }

    const usuario = await usuariosRepository.buscarEmail(email_usuario)

    if (!usuario) {
      return res.status(401).send({ erro: 'Credenciais invalidas' })
    }
    const senha_usuario = await bcrypt.compare(senha, usuario.senha_usuario)

    if (!senha_usuario) {
      return res.status(401).send({ erro: 'Credenciais invalidas' })
    }
    const token = jwt.sign(
      {
        id: usuario.id_usuario.toString(),
        nome: usuario.nome_usuario,
        cargo: usuario.cargo_usuario,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )
    res.status(200).send({ token })
  } catch (e) {
    console.log(e)
    res.status(500).send({ erro: 'ocorreu um erro inesperado..' })
  }
}

// add logout
