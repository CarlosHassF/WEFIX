// erro com status HTTP, convertido em resposta pelo middleware trataErros
export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem)
    this.status = status
  }
}

// converte id vindo de url/body em BigInt, aceitando so inteiros positivos
export function paraBigInt(valor, nome = 'id') {
  const texto = typeof valor === 'number' ? String(valor) : valor
  if (typeof texto !== 'string' || !/^\d+$/.test(texto) || BigInt(texto) < 1n) {
    throw new ErroHttp(400, `${nome} inválido`)
  }
  return BigInt(texto)
}
