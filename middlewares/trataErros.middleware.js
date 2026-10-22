import { ErroHttp } from '../utils/erroHttp.js'

// ultimo middleware: toda falha vira { erro } com o status adequado
export function trataErros(err, req, res, next) {
  if (err instanceof ErroHttp) {
    return res.status(err.status).json({ erro: err.message })
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido' })
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ erro: 'Registro duplicado' })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ erro: 'Registro não encontrado' })
  }
  console.error(err)
  res.status(500).json({ erro: 'ocorreu um erro inesperado..' })
}

// rota que nao existe tambem responde { erro }
export function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada' })
}
