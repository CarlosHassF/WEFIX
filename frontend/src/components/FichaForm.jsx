import { useState } from 'react'

const VAZIO = {
  nome_cliente: '',
  numero_cliente: '',
  valor_servico: '',
  observacao: '',
}

function FichaForm({ onSubmit, enviando, fichaInicial = null, aoCancelar }) {
  // preenche o formulario com os dados da ficha se estiver editando
  const [dados, setDados] = useState(() => {
    if (!fichaInicial) return VAZIO
    const digitos = String(fichaInicial.numero_cliente || '').replace(/\D/g, '').slice(0, 11)
    let telefone = digitos
    if (digitos.length > 2) telefone = `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
    if (digitos.length > 7) telefone = `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
    return {
      nome_cliente: fichaInicial.nome_cliente || '',
      numero_cliente: telefone,
      valor_servico: String(fichaInicial.valor_servico ?? '').replace('.', ','),
      observacao: fichaInicial.observacao || '',
    }
  })
  const [erros, setErros] = useState({})

  // valida os campos e retorna mensagem se tiver algum problema
  function validarCampo(name, value) {
    if (name === 'nome_cliente') {
      if (!value.trim()) {
        return 'Informe o nome do cliente.'
      }
    }

    if (name === 'numero_cliente') {
      const telefone = value.trim()
      const digitos = telefone.replace(/\D/g, '')
      if (!telefone) {
        return 'Informe o telefone do cliente.'
      }
      if (digitos.length !== 10 && digitos.length !== 11) {
        return 'Digite um telefone válido com DDD.'
      }
    }

    if (name === 'valor_servico') {
      const valor = Number(value.replace(',', '.'))
      if (!value.trim()) {
        return 'Informe o valor do serviço.'
      }
      if (!Number.isFinite(valor) || valor <= 0) {
        return 'Informe um valor maior que zero.'
      }
    }

    return ''
  }

  function handleChange(e) {
    const { name, value } = e.target

    let novoValor = value
    // deixa o telefone so com numeros e vai formatando enquanto digita
    if (name === 'numero_cliente') {
      const numeros = value.replace(/\D/g, '').slice(0, 11)
      novoValor = numeros
      if (numeros.length > 2) {
        novoValor = `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
      }
      if (numeros.length > 7) {
        novoValor = `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
      }
    }

    setDados({ ...dados, [name]: novoValor }) //atualiza o campo que mudou sem apagar os outros
    setErros({ ...erros, [name]: validarCampo(name, novoValor),}) // confere se o campo que mudou tem algum erro
  }

  async function handleSubmit(e) {
    e.preventDefault()

    // confere todos os campos de novo antes de enviar
    const novosErros = {
      nome_cliente: validarCampo('nome_cliente', dados.nome_cliente),
      numero_cliente: validarCampo('numero_cliente', dados.numero_cliente),
      valor_servico: validarCampo('valor_servico', dados.valor_servico),
    }
    setErros(novosErros)

    // se tiver algum erro, para por aq e nao envia
    if (Object.values(novosErros).some(Boolean)) {
      return
    }
    // "arruma" os dados antes de mandar
    const ok = await onSubmit({
      ...dados,
      nome_cliente: dados.nome_cliente.trim(),
      numero_cliente: dados.numero_cliente.trim(),
      valor_servico: Number(dados.valor_servico.replace(',', '.')),
      observacao: dados.observacao.trim(),
    })
    // limpa o formulario e erros se deu certo
    if (ok) {
      if (!fichaInicial) setDados(VAZIO)
      setErros({})
    }
  }

  //msgs de erro personalizadsa 
  return (
    <form className="form" onSubmit={handleSubmit} noValidate> 
      <label>
        Nome do cliente *
        <input name="nome_cliente" value={dados.nome_cliente} onChange={handleChange} maxLength={50} required aria-invalid={Boolean(erros.nome_cliente)} className={erros.nome_cliente ? 'campo-invalido' : ''}/>
        {erros.nome_cliente && (<span className="mensagem-erro">{erros.nome_cliente}</span>)}
      </label>

      <label>
        Telefone do cliente *
        <input type="tel" name="numero_cliente" value={dados.numero_cliente} onChange={handleChange} placeholder="(42) 99999-1234" maxLength={16} required aria-invalid={Boolean(erros.numero_cliente)} className={erros.numero_cliente ? 'campo-invalido' : ''}/>
        {erros.numero_cliente && (<span className="mensagem-erro">{erros.numero_cliente}</span>)}
      </label>

      <label>
        Valor do serviço (R$) *
        <input type="text" name="valor_servico" value={dados.valor_servico} onChange={handleChange} inputMode="decimal" placeholder="Ex.: 150,00" required aria-invalid={Boolean(erros.valor_servico)} className={erros.valor_servico ? 'campo-invalido' : ''} />
        {erros.valor_servico && (<span className="mensagem-erro">{erros.valor_servico}</span>)}
      </label>

      <label>
        Observações
        <textarea name="observacao" value={dados.observacao} onChange={handleChange} maxLength={400} rows={4}/>
      </label>

      <button type="submit" disabled={enviando}>
        {enviando ? 'Salvando...' : fichaInicial ? 'Salvar alterações' : 'Registrar ordem de serviço'}
      </button>
      {aoCancelar && <button type="button" onClick={aoCancelar} disabled={enviando}>Cancelar edição</button>}
    </form>
  )
}

export default FichaForm
