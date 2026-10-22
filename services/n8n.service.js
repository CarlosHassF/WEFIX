import { buscarFichaPorId } from '../repository/fichas.repository.js'

// avisa o n8n (que manda o whatsapp ao cliente); nunca lanca erro
// DECISAO: reenvio de webhook que falhou — escolhido: só log; alternativas: fila/tabela de pendências com nova tentativa
export async function notificar(evento, id_manutencao) {
  const url = process.env.N8N_WEBHOOK_URL
  if (!url) {
    console.warn(
      `n8n: N8N_WEBHOOK_URL ausente, ${evento} da ficha #${id_manutencao} não enviado`
    )
    return
  }

  try {
    const ficha = await buscarFichaPorId(id_manutencao)
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        evento,
        id_manutencao: id_manutencao.toString(),
        cliente: {
          nome: ficha.cliente.nome_cliente,
          whatsapp: ficha.cliente.whatsapp_cliente,
        },
        dispositivo: {
          tipo: ficha.dispositivo.tipo,
          marca: ficha.dispositivo.marca,
          modelo: ficha.dispositivo.modelo,
        },
        diagnostico: ficha.diagnostico,
        valor_servico: ficha.valor_servico?.toString() ?? null,
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!resposta.ok) {
      console.error(
        `n8n: webhook ${evento} da ficha #${id_manutencao} respondeu ${resposta.status}`
      )
    }
  } catch (e) {
    console.error(
      `n8n: falha ao enviar ${evento} da ficha #${id_manutencao}:`,
      e.message
    )
  }
}
