import * as usuariosRepository from '../repository/usuarios.repository.js'
import bycrypt from 'bcrypt'

export async function buscarTodosUsuarios(req, res) {
  try {
    const resultado = await usuariosRepository.buscarTodosUsuariosModel()
    res.status(200).send(resultado)
  } catch (e) {
    console.log(e)
    res.status(500).send({ erro: 'ocorreu um erro inesperado..' })

    console.log(require('crypto').randomBytes(64).toString('hex'))
  }
}

export async function criaUsuario(req, res) {
  try {
    const { nome_usuario, email_usuario, senha, cargo_usuario } = req.body

    const senha_usuario = await bycrypt.hash(senha, 10)

    const dados = {
      nome_usuario,
      email_usuario,
      senha_usuario,
      cargo_usuario,
    }

    await usuariosRepository.criaUsuario(dados)
    res.status(201).send('usuario criado com sucesso')
  } catch (e) {
    console.log(e)
    res.status(500).send({ erro: 'ocorreu um erro inesperado..' })
  }
}

export async function editaUsuario(req, res) {
  try {
    const id_usuario = req.params.id_usuario
    if (!id_usuario) {
      return res.status(400).send('Dados obrigatorios faltando')
    }
    const { nome_usuario, email_usuario, senha, cargo_usuario } = req.body

    if (senha) {
      const senha_usuario = await bycrypt.hash(senha, 10)
    }

    const dados = {
      nome_usuario,
      email_usuario,
      senha_usuario,
      cargo_usuario,
    }

    await usuariosRepository.editaUsuario(BigInt(id_usuario, 10), dados)
    res.status(201).send('usuario editado com sucesso')
  } catch (e) {
    console.log(e)
    res.status(500).send({ erro: 'ocorreu um erro inesperado..' })
  }
}

export async function deletaUsuario(req, res) {
  try {
    const id_usuario = BigInt(req.params.id_usuario)

    if (!id_usuario) {
      res.status(400).send('Dados obrigatorios faltando')
    }

    await usuariosRepository.deletaUsuario(id_usuario)
    res.status(204).send()
  } catch (e) {
    console.log(e)
    res.status(500).send({ erro: 'ocorreu um erro inesperado..' })
  }
}
