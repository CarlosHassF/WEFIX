import bcrypt from 'bcrypt'
import * as usuariosRepository from '../repository/usuarios.repository.js'
import { ErroHttp, paraBigInt } from '../utils/erroHttp.js'
import { validaTexto } from '../utils/validacao.js'

const CARGOS = ['atendente', 'admin', 'tecnico']

// valida campos de usuario; na criacao todos sao obrigatorios
function dadosUsuario(body, { criacao }) {
  const nome_usuario = validaTexto(body.nome_usuario, 'nome_usuario', 100)
  const email_usuario = validaTexto(body.email_usuario, 'email_usuario', 100)
  const { senha, cargo_usuario } = body

  if (
    criacao &&
    (!nome_usuario || !email_usuario || !senha || !cargo_usuario)
  ) {
    throw new ErroHttp(400, 'Dados obrigatorios faltando')
  }
  // DECISAO: tamanho minimo da senha — escolhido: 6 caracteres; alternativas: 8+, regras de complexidade
  if (senha !== undefined && (typeof senha !== 'string' || senha.length < 6)) {
    throw new ErroHttp(400, 'senha deve ter ao menos 6 caracteres')
  }
  if (cargo_usuario !== undefined && !CARGOS.includes(cargo_usuario)) {
    throw new ErroHttp(400, 'cargo_usuario inválido')
  }
  return { nome_usuario, email_usuario, senha, cargo_usuario }
}

export async function buscarTodosUsuarios(req, res) {
  res.status(200).json(await usuariosRepository.listarUsuarios())
}

export async function criaUsuario(req, res) {
  const { senha, ...dados } = dadosUsuario(req.body ?? {}, { criacao: true })
  const senha_usuario = await bcrypt.hash(senha, 10)

  const usuario = await usuariosRepository.criarUsuario({
    ...dados,
    senha_usuario,
  })
  res.status(201).json(usuario)
}

export async function editaUsuario(req, res) {
  const id_usuario = paraBigInt(req.params.id_usuario, 'id_usuario')
  const { senha, ...dados } = dadosUsuario(req.body ?? {}, { criacao: false })

  // so troca o hash quando uma senha nova vier
  if (senha) {
    dados.senha_usuario = await bcrypt.hash(senha, 10)
  }

  const usuario = await usuariosRepository.editarUsuario(id_usuario, dados)
  res.status(200).json(usuario)
}

export async function alteraAtivo(req, res) {
  const id_usuario = paraBigInt(req.params.id_usuario, 'id_usuario')
  const { ativo } = req.body ?? {}

  if (typeof ativo !== 'boolean') {
    throw new ErroHttp(400, 'ativo deve ser true ou false')
  }

  const usuario = await usuariosRepository.alterarAtivo(id_usuario, ativo)
  res.status(200).json(usuario)
}
