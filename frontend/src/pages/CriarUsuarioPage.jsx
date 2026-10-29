import { useState } from 'react'
import UsuarioForm from '../components/UsuarioForm.jsx'
import { criarUsuario } from '../services/usuariosService.js'

function CriarUsuarioPage() {
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const [erro, setErro] = useState(null)

  async function handleCriar(dados) {
    setEnviando(true)
    setMensagem(null)
    setErro(null)

    try {
      const resposta = await criarUsuario(dados)
      setMensagem(`Usuário ${resposta.nome_usuario} criado com cargo ${resposta.cargo_usuario}.`)
      return true
    } catch (e) {
      setErro(e.message)
      return false
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section>
      <h2>Novo usuario</h2>
      {mensagem && <p className="sucesso">{mensagem}</p>}
      {erro && <p className="erro">{erro}</p>}
      <UsuarioForm onSubmit={handleCriar} enviando={enviando} />
    </section>
  )
}

export default CriarUsuarioPage
