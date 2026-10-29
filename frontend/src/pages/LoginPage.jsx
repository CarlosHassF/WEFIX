import { useState } from 'react'
import { login } from '../services/authService.js'

function LoginPage({ onLogin }) {
  const [dados, setDados] = useState({ email_usuario: '', senha: '' })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  function handleChange(e) {
    setDados({ ...dados, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    try {
      const usuario = await login(dados.email_usuario.trim(), dados.senha)
      if (!usuario) throw new Error('Não foi possível identificar o usuário.')
      onLogin(usuario)
    } catch (e) {
      setErro(e.message || 'Erro ao fazer login')
      setEnviando(false)
    }
  }

  return (
    <section className="login">
      <span className="login-marca" aria-hidden="true">
        W
      </span>
      <h2>Bem-vindo(a), realize o login abaixo</h2>
      {erro && <p className="mensagem-erro">{erro}</p>}
      <form className="form" onSubmit={handleSubmit}>
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
            required
          />
        </label>
        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </section>
  )
}

export default LoginPage
