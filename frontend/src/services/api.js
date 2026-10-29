async function lerResposta(response) {
  const texto = await response.text()
  if (!texto) return null
  try {
    return JSON.parse(texto)
  } catch {
    return texto
  }
}

export async function requisicao(url, opcoes = {}) {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('Token não encontrado. Faça login novamente.')

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
    const mensagem =
      corpo?.erro ||
      (typeof corpo === 'string' && corpo) ||
      `Erro na requisição: ${response.status}`
    throw new Error(mensagem)
  }
  return corpo
}

export async function requisicaoPaginada(url, filtros = {}) {
  const itens = []
  let pagina = 1
  const limite = 100

  while (true) {
    const params = new URLSearchParams({ pagina: String(pagina), limite: String(limite) })
    for (const [chave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        params.set(chave, String(valor))
      }
    }
    const separador = url.includes('?') ? '&' : '?'
    const lote = await requisicao(`${url}${separador}${params}`)
    const lista = Array.isArray(lote) ? lote : []
    itens.push(...lista)
    if (lista.length < limite) break
    pagina += 1
  }

  return itens
}
