// avisa o n8n sobre um evento da ficha (implementacao completa na integracao n8n)
export async function notificar(evento, id_manutencao) {
  console.log(`n8n: ${evento} da ficha #${id_manutencao}`)
}
