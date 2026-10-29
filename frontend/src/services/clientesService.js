import { requisicao, requisicaoPaginada } from './api.js'

export async function listarClientes(busca) {
  return requisicaoPaginada('/api/clientes', busca ? { busca } : {})
}

export async function criarCliente(dados) {
  return requisicao('/api/clientes', {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}

export async function listarDispositivos(idCliente) {
  return requisicao(`/api/clientes/${idCliente}/dispositivos`)
}

export async function criarDispositivo(idCliente, dados) {
  return requisicao(`/api/clientes/${idCliente}/dispositivos`, {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}

export async function garantirCliente({ nome_cliente, whatsapp_cliente, email_cliente }) {
  const encontrados = await listarClientes(whatsapp_cliente)
  const existente = encontrados.find((cliente) => cliente.whatsapp_cliente === whatsapp_cliente)
  if (existente) return existente

  try {
    return await criarCliente({
      nome_cliente,
      whatsapp_cliente,
      ...(email_cliente ? { email_cliente } : {}),
    })
  } catch (erro) {
    if (!String(erro.message).toLowerCase().includes('duplicado')) throw erro
    const novamente = await listarClientes(whatsapp_cliente)
    const duplicado = novamente.find((cliente) => cliente.whatsapp_cliente === whatsapp_cliente)
    if (duplicado) return duplicado
    throw erro
  }
}
