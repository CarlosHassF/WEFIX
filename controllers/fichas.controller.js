import * as fichasRepository from '../repository/fichas.repository.js'

export async function listarTodasFichas(req, res) {
  try {
    const resultado = await fichasRepository.buscarTodasFichas()
    res.status(200).send(resultado)
  } catch (e) {
    console.log(e)
    res.status(500).send({ erro: 'ocorreu um erro inesperado..' })
  }
}

export async function listarFichasStatus(req, res) {
  try {
    const { status } = req.params
    const resultado = await fichasRepository.buscarFichaPorStatus(status)
    res.status(200).send(resultado)
  } catch (e) {
    console.log(e)
    res.status(500).send({ erro: 'ocorreu um erro inesperado..' })
  }
}

export async function criaFicha(req, res) {
  try {
    const { nome_cliente, valor_servico, numero_cliente, observacao } = req.body

    if (!nome_cliente || !valor_servico || !numero_cliente) {
      return res.status(400).send('Dados obrigatorios faltando!')
    }

    const dados = {
      nome_cliente,
      valor_servico,
      numero_cliente,
      observacao,
    }
    const ficha = await fichasRepository.criaNovaFicha(dados)
    res
      .status(201)
      .send('Ficha criada com sucesso o id da ficha é #' + ficha.id_manutencao)
  } catch (e) {
    console.log(e)
    res.status(500).send('Algo deu errado..')
  }
}

export async function alteraStatus(req, res) {
  try {
    const { id_manutencao, status } = req.body

    if (!id_manutencao) {
      return res.status(400).send('Dados obrigatorios faltando!')
    }

    await fichasRepository.alteraStatusFicha(status, BigInt(id_manutencao))
    res.status(200).send('Ficha alterada com sucesso')
  } catch (e) {
    console.log(e)
    res.status(500).send('Algo deu errado')
  }
}

export async function deletaFicha(req, res) {
  try {
    const { id_manutencao } = BigInt(req.params)
    await fichasRepository.deletaFicha(id_manutencao)
    res.status(204).send()
  } catch (e) {
    console.log(e)
    res.status(500).send('algo deu errado')
  }
}

export async function alteraFicha(req, res) {
  try {
    const id_manutencao = req.params.id_manutencao
    const { nome_cliente, valor_servico, numero_cliente, observacao } = req.body

    if (!id_manutencao) {
      return res.status(400).send('Ficha não encontrada')
    }

    const dados = {
      nome_cliente,
      valor_servico,
      numero_cliente,
      observacao,
    }

    await fichasRepository.alteraFichaModel(BigInt(id_manutencao), dados)
    return res.status(200).send('Ficha alterada com sucesso')
  } catch (e) {
    console.log(e)
    res.status(500).send('algo deu errado')
  }
}
