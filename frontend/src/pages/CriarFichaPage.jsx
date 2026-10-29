import { useState } from 'react'
import FichaForm from '../components/FichaForm.jsx'
import { registrarOrdem } from '../services/fichasService.js'

function CriarFichaPage() {
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const [erro, setErro] = useState(null)

  async function handleCriar(dados) {
    setEnviando(true)
    setMensagem(null)
    setErro(null)

    try {
      const resposta = await registrarOrdem(dados)
      setMensagem(`Ordem #${resposta.id_manutencao} registrada com status aberta.`)
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
      <h2>Nova ordem de serviço</h2>
      {mensagem && <p className="sucesso">{mensagem}</p>}
      {erro && <p className="erro">{erro}</p>}
      <FichaForm onSubmit={handleCriar} enviando={enviando} modo="criar" />
    </section>
  )
}

export default CriarFichaPage
