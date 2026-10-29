import { useEffect, useState } from 'react'
import { buscarClientePorEmail } from '../services/clientesService.js'
import { TIPOS_DISPOSITIVO, formatarTelefone } from '../utils/statusFicha.js'

const VAZIO = {
  nome_cliente: '',
  numero_cliente: '',
  email_cliente: '',
  tipo: 'notebook',
  marca: '',
  modelo: '',
  numero_serie: '',
  defeito_relatado: '',
  acessorios: '',
  estado_entrada: '',
  senha_dispositivo: '',
  observacao: '',
  diagnostico: '',
  valor_servico: '',
}

function preencher(fichaInicial, modo) {
  if (!fichaInicial) return VAZIO
  return {
    ...VAZIO,
    nome_cliente: fichaInicial.cliente?.nome_cliente || '',
    numero_cliente: formatarTelefone(
      fichaInicial.cliente?.whatsapp_cliente || ''
    ),
    defeito_relatado: fichaInicial.defeito_relatado || '',
    acessorios: fichaInicial.acessorios || '',
    estado_entrada: fichaInicial.estado_entrada || '',
    senha_dispositivo: fichaInicial.senha_dispositivo || '',
    observacao: fichaInicial.observacao || '',
    diagnostico: fichaInicial.diagnostico || '',
    valor_servico:
      fichaInicial.valor_servico != null
        ? String(fichaInicial.valor_servico).replace('.', ',')
        : '',
    tipo: fichaInicial.dispositivo?.tipo || 'notebook',
    marca: fichaInicial.dispositivo?.marca || '',
    modelo: fichaInicial.dispositivo?.modelo || '',
    numero_serie: fichaInicial.dispositivo?.numero_serie || '',
    modo,
  }
}

function FichaForm({
  onSubmit,
  enviando,
  fichaInicial = null,
  aoCancelar,
  modo = 'criar',
}) {
  const [dados, setDados] = useState(() => preencher(fichaInicial, modo))
  const [erros, setErros] = useState({})
  const [buscaCliente, setBuscaCliente] = useState('')
  const diagnostico = modo === 'diagnostico'
  const criacao = modo === 'criar'

  useEffect(() => {
    if (!criacao) return undefined

    const email = dados.email_cliente.trim().toLocaleLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return undefined
    }

    let cancelada = false
    const timer = setTimeout(async () => {
      setBuscaCliente('buscando')
      try {
        const cliente = await buscarClientePorEmail(email)
        if (cancelada) return

        if (!cliente) {
          setBuscaCliente('nao-encontrado')
          return
        }

        setDados((atuais) => ({
          ...atuais,
          nome_cliente: cliente.nome_cliente || atuais.nome_cliente,
          numero_cliente: cliente.whatsapp_cliente
            ? formatarTelefone(cliente.whatsapp_cliente)
            : atuais.numero_cliente,
        }))
        setErros((atuais) => ({
          ...atuais,
          nome_cliente: '',
          numero_cliente: '',
        }))
        setBuscaCliente('encontrado')
      } catch (erro) {
        if (cancelada) return
        console.error('Erro ao buscar cliente pelo email:', erro)
        setBuscaCliente('erro')
      }
    }, 350)

    return () => {
      cancelada = true
      clearTimeout(timer)
    }
  }, [criacao, dados.email_cliente])

  function validarCampo(name, value) {
    if (diagnostico) {
      if (name === 'diagnostico' && !value.trim())
        return 'Informe o diagnóstico.'
      if (name === 'valor_servico') {
        const valor = Number(String(value).replace(',', '.'))
        if (!String(value).trim()) return 'Informe o valor do serviço.'
        if (!Number.isFinite(valor) || valor < 0)
          return 'Informe um valor válido.'
      }
      return ''
    }

    if (name === 'nome_cliente' && criacao && !value.trim())
      return 'Informe o nome do cliente.'
    if (name === 'numero_cliente' && criacao) {
      const digitos = value.replace(/\D/g, '')
      if (!value.trim()) return 'Informe o WhatsApp do cliente.'
      if (digitos.length < 10 || digitos.length > 13) {
        return 'Digite um WhatsApp válido com DDD.'
      }
    }
    if (name === 'marca' && criacao && !value.trim()) return 'Informe a marca.'
    if (name === 'modelo' && criacao && !value.trim())
      return 'Informe o modelo.'
    if (name === 'defeito_relatado' && !value.trim())
      return 'Informe o defeito relatado.'
    return ''
  }

  function handleChange(e) {
    const { name, value } = e.target
    let novoValor = value
    if (name === 'numero_cliente') {
      const numeros = value.replace(/\D/g, '').slice(0, 11)
      novoValor = numeros
      if (numeros.length > 2)
        novoValor = `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
      if (numeros.length > 7) {
        novoValor = `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
      }
    }
    if (name === 'email_cliente') setBuscaCliente('')
    setDados((atuais) => ({ ...atuais, [name]: novoValor }))
    setErros((atuais) => ({
      ...atuais,
      [name]: validarCampo(name, novoValor),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const campos = diagnostico
      ? ['diagnostico', 'valor_servico']
      : criacao
        ? [
            'nome_cliente',
            'numero_cliente',
            'marca',
            'modelo',
            'defeito_relatado',
          ]
        : ['defeito_relatado']
    const novosErros = Object.fromEntries(
      campos.map((campo) => [campo, validarCampo(campo, dados[campo])])
    )
    setErros(novosErros)
    if (Object.values(novosErros).some(Boolean)) return

    const payload = { ...dados }
    if (diagnostico) {
      payload.valor_servico = Number(
        String(dados.valor_servico).replace(',', '.')
      )
    }
    const ok = await onSubmit(payload)
    if (ok) {
      if (criacao) {
        setDados(VAZIO)
        setBuscaCliente('')
      }
      setErros({})
    }
  }

  return (
    <form className="form form-largo" onSubmit={handleSubmit} noValidate>
      {criacao && (
        <>
          <label>
            Nome do cliente *
            <input
              name="nome_cliente"
              value={dados.nome_cliente}
              onChange={handleChange}
              maxLength={100}
              required
              aria-invalid={Boolean(erros.nome_cliente)}
              className={erros.nome_cliente ? 'campo-invalido' : ''}
            />
            {erros.nome_cliente && (
              <span className="mensagem-erro">{erros.nome_cliente}</span>
            )}
          </label>
          <label>
            WhatsApp do cliente *
            <input
              type="tel"
              name="numero_cliente"
              value={dados.numero_cliente}
              onChange={handleChange}
              placeholder="(11) 99999-1234"
              maxLength={16}
              required
              aria-invalid={Boolean(erros.numero_cliente)}
              className={erros.numero_cliente ? 'campo-invalido' : ''}
            />
            {erros.numero_cliente && (
              <span className="mensagem-erro">{erros.numero_cliente}</span>
            )}
          </label>
          <label>
            Email do cliente
            <input
              type="email"
              name="email_cliente"
              value={dados.email_cliente}
              onChange={handleChange}
              maxLength={100}
            />
            {buscaCliente === 'buscando' && (
              <span className="cliente-busca-status" role="status">
                Buscando cliente...
              </span>
            )}
            {buscaCliente === 'encontrado' && (
              <span
                className="cliente-busca-status cliente-busca-sucesso"
                role="status"
              >
                Cliente encontrado; nome e WhatsApp preenchidos.
              </span>
            )}
            {buscaCliente === 'nao-encontrado' && (
              <span className="cliente-busca-status" role="status">
                Cliente não encontrado. Preencha os dados manualmente.
              </span>
            )}
            {buscaCliente === 'erro' && (
              <span className="cliente-busca-status mensagem-erro" role="alert">
                Não foi possível consultar o cliente. Tente novamente.
              </span>
            )}
          </label>
          <label>
            Tipo do dispositivo *
            <select name="tipo" value={dados.tipo} onChange={handleChange}>
              {TIPOS_DISPOSITIVO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Marca *
            <input
              name="marca"
              value={dados.marca}
              onChange={handleChange}
              maxLength={50}
              required
              className={erros.marca ? 'campo-invalido' : ''}
            />
            {erros.marca && (
              <span className="mensagem-erro">{erros.marca}</span>
            )}
          </label>
          <label>
            Modelo *
            <input
              name="modelo"
              value={dados.modelo}
              onChange={handleChange}
              maxLength={100}
              required
              className={erros.modelo ? 'campo-invalido' : ''}
            />
            {erros.modelo && (
              <span className="mensagem-erro">{erros.modelo}</span>
            )}
          </label>
          <label>
            Número de série / IMEI
            <input
              name="numero_serie"
              value={dados.numero_serie}
              onChange={handleChange}
              maxLength={50}
            />
          </label>
        </>
      )}

      {!criacao && !diagnostico && (
        <p>
          Cliente: {dados.nome_cliente || '—'} — {dados.numero_cliente || '—'}
        </p>
      )}

      {diagnostico ? (
        <>
          <label>
            Diagnóstico *
            <textarea
              name="diagnostico"
              value={dados.diagnostico}
              onChange={handleChange}
              maxLength={1000}
              rows={4}
              required
              className={erros.diagnostico ? 'campo-invalido' : ''}
            />
            {erros.diagnostico && (
              <span className="mensagem-erro">{erros.diagnostico}</span>
            )}
          </label>
          <label>
            Valor do serviço (R$) *
            <input
              name="valor_servico"
              value={dados.valor_servico}
              onChange={handleChange}
              inputMode="decimal"
              placeholder="Ex.: 150,00"
              required
              className={erros.valor_servico ? 'campo-invalido' : ''}
            />
            {erros.valor_servico && (
              <span className="mensagem-erro">{erros.valor_servico}</span>
            )}
          </label>
        </>
      ) : (
        <>
          <label>
            Defeito relatado *
            <textarea
              name="defeito_relatado"
              value={dados.defeito_relatado}
              onChange={handleChange}
              maxLength={400}
              rows={3}
              required
              className={erros.defeito_relatado ? 'campo-invalido' : ''}
            />
            {erros.defeito_relatado && (
              <span className="mensagem-erro">{erros.defeito_relatado}</span>
            )}
          </label>
          <label>
            Acessórios
            <input
              name="acessorios"
              value={dados.acessorios}
              onChange={handleChange}
              maxLength={200}
            />
          </label>
          <label>
            Estado de entrada
            <textarea
              name="estado_entrada"
              value={dados.estado_entrada}
              onChange={handleChange}
              maxLength={400}
              rows={2}
            />
          </label>
          <label>
            Senha do dispositivo
            <input
              name="senha_dispositivo"
              value={dados.senha_dispositivo}
              onChange={handleChange}
              maxLength={100}
            />
          </label>
          <label>
            Observações
            <textarea
              name="observacao"
              value={dados.observacao}
              onChange={handleChange}
              maxLength={400}
              rows={3}
            />
          </label>
        </>
      )}

      <div className="form-acoes">
        <button type="submit" disabled={enviando}>
          {enviando
            ? 'Salvando...'
            : fichaInicial
              ? 'Salvar alterações'
              : 'Registrar ordem de serviço'}
        </button>
        {aoCancelar && (
          <button type="button" onClick={aoCancelar} disabled={enviando}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

export default FichaForm
