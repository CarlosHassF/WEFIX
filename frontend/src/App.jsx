import { useState } from 'react'
import './App.css'
import CriarUsuarioPage from './pages/CriarUsuarioPage.jsx'
import ListarUsuariosPage from './pages/ListarUsuariosPage.jsx'
import ListarFichasPage from './pages/ListarFichasPage.jsx'
import CriarFichaPage from './pages/CriarFichaPage.jsx'
import KanbanPage from './pages/KanbanPage.jsx'

// sem react-router por enquanto: um estado escolhe qual page mostrar
function App() {
  const [pagina, setPagina] = useState('kanban')

  return (
    <div className="app">
      <header>
        <h1>WEFIX</h1>
        <nav>
          <button onClick={() => setPagina('kanban')} disabled={pagina === 'kanban'}>
            Kanban
          </button>
          <button onClick={() => setPagina('fichas')} disabled={pagina === 'fichas'}>
            Listar ordens de servico
          </button>
          <button onClick={() => setPagina('criar-ficha')} disabled={pagina === 'criar-ficha'}>
            Registrar ordem
          </button>
          <button onClick={() => setPagina('listar')} disabled={pagina === 'listar'}>
            Listar usuarios
          </button>
          <button onClick={() => setPagina('criar')} disabled={pagina === 'criar'}>
            Criar usuario
          </button>
        </nav>
      </header>

      <main>
        {pagina === 'kanban' && <KanbanPage />}
        {pagina === 'fichas' && <ListarFichasPage />}
        {pagina === 'criar-ficha' && <CriarFichaPage />}
        {pagina === 'listar' && <ListarUsuariosPage />}
        {pagina === 'criar' && <CriarUsuarioPage />}
      </main>
    </div>
  )
}

export default App
