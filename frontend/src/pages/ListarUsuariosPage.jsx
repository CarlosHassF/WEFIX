import { useEffect, useState } from 'react'
import UsuariosTabela from '../components/UsuariosTabela.jsx'
import { listarUsuarios } from '../services/usuariosService.js'

// enquanto nao existe tela de login, o token e lido do localStorage
// (faca login no Postman e rode no console do navegador:
//  localStorage.setItem('token', '<token>'))
function ListarUsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      const token = localStorage.getItem('token')
      setUsuarios(await listarUsuarios(token))
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  // [] = roda uma vez, quando a page aparece na tela
  useEffect(() => {
    carregar()
  }, [])

  return (
    <section>
      <h2>Usuarios</h2>
      <button onClick={carregar} disabled={carregando}>
        Atualizar
      </button>

      {carregando && <p>Carregando...</p>}
      {erro && <p className="erro">{erro}</p>}
      {!carregando && !erro && <UsuariosTabela usuarios={usuarios} />}
    </section>
  )
}

export default ListarUsuariosPage
