// todas as chamadas da API de usuarios ficam aqui
// '/api' e repassado pelo proxy do Vite para http://localhost:3000

const API_URL = '/api/usuarios'

// le a resposta como JSON ou texto (o backend responde dos dois jeitos)
async function lerResposta(response) {
  const tipo = response.headers.get('content-type') || ''
  return tipo.includes('application/json') ? response.json() : response.text()
}

// GET /usuarios — exige token de um usuario admin
export async function listarUsuarios(token) {
  const response = await fetch(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const corpo = await lerResposta(response)

  if (!response.ok) {
    throw new Error(corpo?.erro || corpo || 'Erro ao listar usuarios')
  }
  return corpo
}

// POST /usuarios — dados: { nome_usuario, email_usuario, senha, cargo_usuario }
export async function criarUsuario(dados) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
  const corpo = await lerResposta(response)

  if (!response.ok) {
    throw new Error(corpo?.erro || corpo || 'Erro ao criar usuario')
  }
  return corpo
}
