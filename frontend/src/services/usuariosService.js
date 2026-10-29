import { requisicao } from './api.js'

const API_URL = '/api/usuarios'

export async function listarUsuarios() {
  return requisicao(API_URL)
}

export async function criarUsuario(dados) {
  return requisicao(API_URL, {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}

export async function alterarAtivoUsuario(id, ativo) {
  return requisicao(`${API_URL}/${id}/ativo`, {
    method: 'PATCH',
    body: JSON.stringify({ ativo }),
  })
}
