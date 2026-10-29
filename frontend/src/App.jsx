import { useEffect, useState } from 'react'
import './App.css'
import LoginPage from './pages/LoginPage.jsx'
import CriarUsuarioPage from './pages/CriarUsuarioPage.jsx'
import ListarUsuariosPage from './pages/ListarUsuariosPage.jsx'
import ListarFichasPage from './pages/ListarFichasPage.jsx'
import CriarFichaPage from './pages/CriarFichaPage.jsx'
import KanbanPage from './pages/KanbanPage.jsx'
import { obterUsuario, logout } from './services/authService.js'

// define quais cargos podem acessar cada tela
const paginas = [
  { id: 'kanban', nome: 'Kanban', cargos: ['admin', 'tecnico', 'atendente'] },
  { id: 'fichas', nome: 'Listar ordens de servico', cargos: ['admin', 'tecnico', 'atendente'] },
  { id: 'criar-ficha', nome: 'Registrar ordem', cargos: ['admin', 'atendente'] },
  { id: 'listar', nome: 'Listar usuarios', cargos: ['admin'] },
  { id: 'criar', nome: 'Criar usuario', cargos: ['admin'] },
]

function App() {
  const [usuario, setUsuario] = useState(obterUsuario)
  const [pagina, setPagina] = useState('kanban')

  const permitidas = usuario ? paginas.filter(p => p.cargos.includes(usuario.cargo)) : []
  const atual = permitidas.find(p => p.id === pagina) || permitidas[0]

  function sair() {
    logout()
    setUsuario(null)
    setPagina('kanban')
  }

  useEffect(() => {
    if (!usuario) return
    const tempoRestante = usuario.exp * 1000 - Date.now()
    if (tempoRestante <= 0) {
      logout()
      setUsuario(null)
      return
    }
    const timer = setTimeout(() => {
      logout()
      setUsuario(null)
    }, tempoRestante)
    return () => clearTimeout(timer)
  }, [usuario])

  return (
    <div className="app">
      <header>
        <h1>WEFIX</h1>
        {usuario && (
          <>
            <nav>
              {permitidas.map(p => (
                <button key={p.id} onClick={() => setPagina(p.id)} disabled={atual?.id === p.id}>{p.nome}</button>
              ))}
            </nav>
            <span>{usuario.nome} ({usuario.cargo})</span>
            <button type="button" onClick={sair}>Sair</button>
          </>
        )}
      </header>
      <main>
        {!usuario && <LoginPage onLogin={setUsuario} />}
        {atual?.id === 'kanban' && <KanbanPage />}
        {atual?.id === 'fichas' && <ListarFichasPage />}
        {atual?.id === 'criar-ficha' && <CriarFichaPage />}
        {atual?.id === 'listar' && <ListarUsuariosPage />}
        {atual?.id === 'criar' && <CriarUsuarioPage />}
      </main>
    </div>
  )
}

export default App