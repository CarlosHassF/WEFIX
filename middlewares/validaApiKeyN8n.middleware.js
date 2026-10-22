import { timingSafeEqual } from 'node:crypto'

// rotas chamadas pelo n8n: autenticadas pelo header x-api-key
export function validaApiKeyN8n(req, res, next) {
  const recebida = Buffer.from(req.headers['x-api-key'] ?? '')
  const esperada = Buffer.from(process.env.N8N_API_KEY ?? '')

  if (
    esperada.length === 0 ||
    recebida.length !== esperada.length ||
    !timingSafeEqual(recebida, esperada)
  ) {
    return res.status(401).json({ erro: 'Chave de API inválida' })
  }
  next()
}
