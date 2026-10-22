import app from '../../app.js'

// sobe a api numa porta livre
export async function subirApp() {
  const servidor = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  return {
    url: `http://127.0.0.1:${servidor.address().port}`,
    fechar: () => new Promise((resolve) => servidor.close(resolve)),
  }
}

// cliente http minimo: cada metodo devolve { status, corpo }
export function req(url, token) {
  async function chamar(metodo, caminho, corpo, { bruto } = {}) {
    const headers = { 'content-type': 'application/json' }
    if (token) headers.authorization = `Bearer ${token}`
    const resposta = await fetch(url + caminho, {
      method: metodo,
      headers,
      body:
        corpo === undefined ? undefined : bruto ? corpo : JSON.stringify(corpo),
    })
    const texto = await resposta.text()
    let json
    try {
      json = texto ? JSON.parse(texto) : undefined
    } catch {
      json = texto
    }
    return { status: resposta.status, corpo: json }
  }
  return {
    get: (caminho) => chamar('GET', caminho),
    post: (caminho, corpo, opcoes) => chamar('POST', caminho, corpo, opcoes),
    put: (caminho, corpo) => chamar('PUT', caminho, corpo),
    patch: (caminho, corpo) => chamar('PATCH', caminho, corpo),
    delete: (caminho) => chamar('DELETE', caminho),
  }
}
