const API_URL = '/api/auth'

// faz login e guarda o token recebido do backend
export async function login(email_usuario, senha) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_usuario, senha }),
  })
  const corpo = await response.json().catch(() => null)
  if (!response.ok) throw new Error(corpo?.erro || 'Erro ao fazer login')
  if (!corpo?.token) throw new Error('O servidor não retornou o token de acesso.')
  localStorage.setItem('token', corpo.token)
  return obterUsuario()
}

// encerra a sessao removendo o token
export function logout() {
  localStorage.removeItem('token')
}

// le os dados do usuario contidos no JWT para controlar a interface
export function obterUsuario() {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const partes = token.split('.')
    if (!partes[1]) throw new Error('Token inválido')
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64), c => c.charCodeAt(0))))
    if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new Error('Token expirado')
    return payload
  } catch {
    logout()
    return null
  }
}
