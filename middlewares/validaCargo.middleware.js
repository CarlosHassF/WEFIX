// uso: validaCargo('admin', 'tecnico')
export function validaCargo(...cargos) {
  return function (req, res, next) {
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Token invalido ou expirado' })
    }
    if (!cargos.includes(req.usuario.cargo)) {
      return res.status(403).json({ erro: 'Ação não permitida' })
    }

    next()
  }
}
