import jwt from 'jsonwebtoken'
import * as usuariosRepository from '../repository/usuarios.repository.js'

export async function validaToken(req, res, next) {
  //recebe o token da requisição
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ erro: 'Token não enviado' })
  }
  //Divida o bearer e o token
  const token = authHeader.split(' ')[1]

  let dados
  try {
    dados = jwt.verify(token, process.env.JWT_SECRET)
  } catch (e) {
    return res.status(401).json({ erro: 'Token invalido' })
  }

  // cargo e situacao vem do banco: usuario desativado perde acesso na hora
  const usuario = await usuariosRepository.buscarUsuarioPorId(BigInt(dados.id))
  if (!usuario || !usuario.ativo) {
    return res.status(401).json({ erro: 'Token invalido' })
  }
  req.usuario = {
    id: usuario.id_usuario,
    nome: usuario.nome_usuario,
    cargo: usuario.cargo_usuario,
  }
  next()
}
