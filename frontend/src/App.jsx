import { useState } from 'react'
import './App.css'
import CriarUsuarioPage from './pages/CriarUsuarioPage.jsx'
import ListarUsuariosPage from './pages/ListarUsuariosPage.jsx'

// sem react-router por enquanto: um estado escolhe qual page mostrar
function App() {
  const [pagina, setPagina] = useState('listar')

  return (
    <div className="app">
      <header>
        <h1>WEFIX</h1>
        <nav>
          <button onClick={() => setPagina('listar')} disabled={pagina === 'listar'}>
            Listar usuarios
          </button>
          <button onClick={() => setPagina('criar')} disabled={pagina === 'criar'}>
            Criar usuario
          </button>
        </nav>
      </header>

      <main>
        {pagina === 'listar' && <ListarUsuariosPage />}
        {pagina === 'criar' && <CriarUsuarioPage />}
      </main>
    </div>
  )
}

export default App
