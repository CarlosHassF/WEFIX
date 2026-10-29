import { useState } from 'react'

const CARGOS = ['atendente', 'tecnico', 'admin']

const VAZIO = {
  nome_usuario: '',
  email_usuario: '',
  senha: '',
  cargo_usuario: 'atendente',
}

// formulario controlado: cada input le e escreve no estado "dados"
// quem usa o componente decide o que fazer no envio via prop onSubmit
// aoCancelar e opcional: se vier, aparece o botao de cancelar (usado no modal)
function UsuarioForm({ onSubmit, enviando, aoCancelar }) {
  const [dados, setDados] = useState(VAZIO)

  function handleChange(e) {
    const { name, value } = e.target
    setDados({ ...dados, [name]: value })
  }

  async function handleSubmit(e) {
    e.preventDefault() // impede o recarregamento da pagina
    const ok = await onSubmit(dados)
    if (ok) setDados(VAZIO) // limpa o formulario se deu certo
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        Nome
        <input
          name="nome_usuario"
          value={dados.nome_usuario}
          onChange={handleChange}
          maxLength={100}
          required
        />
      </label>

      <label>
        Email
        <input
          type="email"
          name="email_usuario"
          value={dados.email_usuario}
          onChange={handleChange}
          maxLength={100}
          required
        />
      </label>

      <label>
        Senha
        <input
          type="password"
          name="senha"
          value={dados.senha}
          onChange={handleChange}
          minLength={6}
          required
        />
      </label>

      <label>
        Cargo
        <select
          name="cargo_usuario"
          value={dados.cargo_usuario}
          onChange={handleChange}
        >
          {CARGOS.map((cargo) => (
            <option key={cargo} value={cargo}>
              {cargo}
            </option>
          ))}
        </select>
      </label>

      <div className="form-acoes">
        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Criar usuário'}
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

export default UsuarioForm
