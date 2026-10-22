import * as dispositivosRepository from '../repository/dispositivos.repository.js'
import * as clientesRepository from '../repository/clientes.repository.js'
import { ErroHttp, paraBigInt } from '../utils/erroHttp.js'
import { validaTexto } from '../utils/validacao.js'

const TIPOS = [
  'notebook',
  'desktop',
  'celular',
  'tablet',
  'impressora',
  'outro',
]

// valida campos de dispositivo; na criacao tipo, marca e modelo sao obrigatorios
function dadosDispositivo(body, { criacao }) {
  const { tipo } = body
  const marca = validaTexto(body.marca, 'marca', 50)
  const modelo = validaTexto(body.modelo, 'modelo', 100)
  const numero_serie = validaTexto(body.numero_serie, 'numero_serie', 50)

  if (criacao && (!tipo || !marca || !modelo)) {
    throw new ErroHttp(400, 'tipo, marca e modelo são obrigatórios')
  }
  if (tipo !== undefined && !TIPOS.includes(tipo)) {
    throw new ErroHttp(400, 'tipo inválido')
  }
  return { tipo, marca, modelo, numero_serie }
}

async function clienteExistente(id) {
  const id_cliente = paraBigInt(id, 'id_cliente')
  if (!(await clientesRepository.buscarClientePorId(id_cliente))) {
    throw new ErroHttp(404, 'Cliente não encontrado')
  }
  return id_cliente
}

export async function listaDispositivos(req, res) {
  const id_cliente = await clienteExistente(req.params.id_cliente)
  res
    .status(200)
    .json(await dispositivosRepository.listarDispositivosDoCliente(id_cliente))
}

export async function criaDispositivo(req, res) {
  const id_cliente = await clienteExistente(req.params.id_cliente)
  const dados = dadosDispositivo(req.body ?? {}, { criacao: true })
  res
    .status(201)
    .json(
      await dispositivosRepository.criarDispositivo({ ...dados, id_cliente })
    )
}

export async function editaDispositivo(req, res) {
  const id_dispositivo = paraBigInt(req.params.id_dispositivo, 'id_dispositivo')
  const dados = dadosDispositivo(req.body ?? {}, { criacao: false })
  res
    .status(200)
    .json(await dispositivosRepository.editarDispositivo(id_dispositivo, dados))
}
