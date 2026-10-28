const API_URL = '/api/fichas'

// le a resposta como JSON ou texto
async function lerResposta(response) {
  const texto = await response.text()
  if (!texto) return null

  try {
    return JSON.parse(texto)
  } catch {
    return texto
  }
}

// adiciona o token nas chamadas que exigem autenticacao
function obterToken() {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('Token não encontrado. Faça login novamente.')
  return token
}

async function requisicao(url, opcoes = {}) {
  const token = obterToken()
  const response = await fetch(url, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
      ...opcoes.headers,
    },
  })
  const corpo = response.status === 204 ? null : await lerResposta(response)

  if (!response.ok) {
    throw new Error(corpo?.erro || corpo || `Erro na requisição: ${response.status}`)
  }
  return corpo
}

// GET /fichas — lista as fichas
export async function listarFichas() {
  return requisicao(API_URL)
}

// POST /fichas — cria uma ficha
export async function criarFicha(dados) {
  return requisicao(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      nome_cliente: dados.nome_cliente.trim(),
      numero_cliente: dados.numero_cliente.trim(),
      valor_servico: Number(dados.valor_servico),
      observacao: (dados.observacao || '').trim(),
      defeito_relatado:(dados.defeito_relatado||'').trim(),
    }),
  })
}

// PUT /fichas/:id — atualiza os dados de uma ficha
export async function atualizarFicha(id, dados) {
  return requisicao(`${API_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      nome_cliente: dados.nome_cliente.trim(),
      numero_cliente: dados.numero_cliente.trim(),
      valor_servico: Number(dados.valor_servico),
      observacao: (dados.observacao || '').trim(),
      defeito_relatado:(dados.defeito_relatado||'').trim(),
    }),
  })
}

// PATCH /fichas — atualiza o status de uma ficha
export async function atualizarStatusFicha(id, status) {
  return requisicao(API_URL, {
    method: 'PATCH',
    body: JSON.stringify({ id_manutencao: id, status }),
  })
}

// DELETE /fichas/:id — exclui uma ficha
export async function excluirFicha(id) {
  return requisicao(`${API_URL}/${id}`, { method: 'DELETE' })
}
