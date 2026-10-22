// erro com status HTTP, convertido em resposta pelo middleware trataErros
export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem)
    this.status = status
  }
}

// maior valor de uma coluna BIGINT do postgres
const BIGINT_MAXIMO = 9223372036854775807n

// converte id vindo de url/body em BigInt, aceitando so inteiros positivos que cabem em BIGINT
export function paraBigInt(valor, nome = 'id') {
  const texto = typeof valor === 'number' ? String(valor) : valor
  if (
    typeof texto !== 'string' ||
    !/^\d+$/.test(texto) ||
    BigInt(texto) < 1n ||
    BigInt(texto) > BIGINT_MAXIMO
  ) {
    throw new ErroHttp(400, `${nome} inválido`)
  }
  return BigInt(texto)
}
