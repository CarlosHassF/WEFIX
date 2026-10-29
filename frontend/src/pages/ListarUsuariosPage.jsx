import { useEffect, useState } from 'react'
import UsuariosTabela from '../components/UsuariosTabela.jsx'
import { alterarAtivoUsuario, listarUsuarios } from '../services/usuariosService.js'

function ListarUsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      setUsuarios(await listarUsuarios())
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function alternarAtivo(usuario) {
    try {
      await alterarAtivoUsuario(usuario.id_usuario, !usuario.ativo)
      await carregar()
    } catch (e) {
      setErro(e.message)
    }
  }

  return (
    <section>
      <h2>Usuarios</h2>
      <button onClick={carregar} disabled={carregando}>
        Atualizar
      </button>

      {carregando && <p>Carregando...</p>}
      {erro && <p className="erro">{erro}</p>}
      {!carregando && !erro && (
        <UsuariosTabela usuarios={usuarios} onAlternarAtivo={alternarAtivo} />
      )}
    </section>
  )
}

export default ListarUsuariosPage
