import { mudarStatus } from '../services/fichaStatus.service.js'
import { ErroHttp, paraBigInt } from '../utils/erroHttp.js'

// resposta do cliente ao orcamento, recebida pelo n8n via whatsapp
export async function respostaOrcamento(req, res) {
  const id = paraBigInt(req.params.id_manutencao, 'id_manutencao')
  const { aprovado } = req.body ?? {}

  if (typeof aprovado !== 'boolean') {
    throw new ErroHttp(400, 'aprovado deve ser true ou false')
  }

  const ficha = await mudarStatus(
    id,
    aprovado ? 'em_manutencao' : 'cancelado',
    {
      tipo: 'n8n',
    }
  )
  res.status(200).json({
    mensagem: aprovado ? 'Orçamento aprovado' : 'Orçamento recusado',
    status: ficha.status,
  })
}
