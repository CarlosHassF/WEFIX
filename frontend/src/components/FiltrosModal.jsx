import { useState } from 'react'
import Modal from './Modal.jsx'

function FiltrosModal({ campos, valores, onFechar, onAplicar }) {
  const [rascunho, setRascunho] = useState(valores)

  function alterar(event) {
    const { name, value } = event.target
    setRascunho((atuais) => ({ ...atuais, [name]: value }))
  }

  function aplicar(event) {
    event.preventDefault()
    onAplicar(rascunho)
    onFechar()
  }

  function limpar() {
    const vazios = Object.fromEntries(campos.map((campo) => [campo.nome, '']))
    setRascunho(vazios)
    onAplicar(vazios)
    onFechar()
  }

  return (
    <Modal titulo="Filtrar resultados" onFechar={onFechar}>
      <form className="form filtro-modal-form" onSubmit={aplicar}>
        {campos.map((campo) => (
          <label key={campo.nome}>
            {campo.rotulo}
            {campo.opcoes ? (
              <select
                name={campo.nome}
                value={rascunho[campo.nome] || ''}
                onChange={alterar}
              >
                <option value="">Todos</option>
                {campo.opcoes.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={campo.nome}
                value={rascunho[campo.nome] || ''}
                onChange={alterar}
                placeholder="Digite para filtrar..."
              />
            )}
          </label>
        ))}
        <div className="form-acoes">
          <button type="button" onClick={limpar}>
            Limpar filtros
          </button>
          <button type="submit" className="botao-primario">
            Aplicar filtros
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default FiltrosModal
