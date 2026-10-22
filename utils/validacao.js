import { ErroHttp } from './erroHttp.js'

// valor monetario >= 0 com ate 2 casas e 8 digitos inteiros (Decimal(10,2)); devolve string normalizada ('150.00')
export function validaValor(valor) {
  const texto = typeof valor === 'number' ? String(valor) : valor
  if (
    typeof texto !== 'string' ||
    !/^\d{1,8}(\.\d{1,2})?$/.test(texto.trim())
  ) {
    throw new ErroHttp(400, 'valor_servico inválido')
  }
  return Number(texto).toFixed(2)
}

// texto opcional com tamanho maximo; devolve undefined se ausente
export function validaTexto(valor, campo, max) {
  if (valor === undefined || valor === null) return undefined
  if (typeof valor !== 'string') {
    throw new ErroHttp(400, `${campo} inválido`)
  }
  const texto = valor.trim()
  if (texto.length > max) {
    throw new ErroHttp(400, `${campo} deve ter no máximo ${max} caracteres`)
  }
  return texto
}
