import jwt from 'jsonwebtoken'

export function validaToken(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).send('Token não enviado')
  }

  const token = authHeader.split(' ')[1]

  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET)
    req.usuario = dados
    next()
  } catch (e) {
    console.log('Erro JWT:', token)
    return res.status(401).send({ erro: 'Token invalido' })
  }
}
