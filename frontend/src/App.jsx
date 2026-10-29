import { useEffect, useState } from 'react'
import './App.css'
import LoginPage from './pages/LoginPage.jsx'
import ListarUsuariosPage from './pages/ListarUsuariosPage.jsx'
import ListarFichasPage from './pages/ListarFichasPage.jsx'
import KanbanPage from './pages/KanbanPage.jsx'
import MetricasPage from './pages/MetricasPage.jsx'
import { obterUsuario, logout } from './services/authService.js'

// define quais cargos podem acessar cada tela
const paginas = [
  {
    id: 'kanban',
    nome: 'Kanban',
    icone: 'kanban',
    cargos: ['admin', 'tecnico', 'atendente'],
  },
  {
    id: 'fichas',
    nome: 'Listar ordens de servico',
    icone: 'fichas',
    cargos: ['admin', 'tecnico', 'atendente'],
  },
  {
    id: 'listar',
    nome: 'Listar usuarios',
    icone: 'usuarios',
    cargos: ['admin'],
  },
  { id: 'metricas', nome: 'Métricas', icone: 'metricas', cargos: ['admin'] },
]

function Icone({ nome }) {
  const conteudo = {
    kanban: (
      <>
        <rect x="3" y="3" width="7" height="18" rx="1.5" />
        <rect x="14" y="3" width="7" height="11" rx="1.5" />
        <path d="M14 18h7" />
      </>
    ),
    fichas: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
    usuarios: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    metricas: (
      <>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-5 5" />
      </>
    ),
    usuario: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    ),
    sair: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>
    ),
  }[nome]

  return (
    <svg
      className="app-icone"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {conteudo}
    </svg>
  )
}

function App() {
  const [usuario, setUsuario] = useState(obterUsuario)
  const [pagina, setPagina] = useState('kanban')

  const permitidas = usuario
    ? paginas.filter((p) => p.cargos.includes(usuario.cargo))
    : []
  const atual = permitidas.find((p) => p.id === pagina) || permitidas[0]

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
    <div className={`app${usuario ? '' : ' app-login'}`}>
      {usuario && (
        <header className="app-header">
          <div className="app-topbar">
            <div className="app-brand">
              <span className="app-brand-marca" aria-hidden="true">
                W
              </span>
              <div>
                <h1>WEFIX</h1>
                <p>Gestão de ordens de serviço</p>
              </div>
            </div>
            <div className="app-usuario">
              <span className="app-usuario-icone" aria-hidden="true">
                <Icone nome="usuario" />
              </span>
              <span className="app-usuario-nome">{usuario.nome}</span>
              <span className="app-usuario-cargo">{usuario.cargo}</span>
              <button type="button" className="app-sair" onClick={sair}>
                <Icone nome="sair" />
                Sair
              </button>
            </div>
          </div>
          <nav aria-label="Navegação principal">
            <div className="app-nav-itens">
              {permitidas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPagina(p.id)}
                  className={atual?.id === p.id ? 'selecionada' : ''}
                  aria-current={atual?.id === p.id ? 'page' : undefined}
                >
                  <Icone nome={p.icone} />
                  {p.nome}
                </button>
              ))}
            </div>
          </nav>
        </header>
      )}
      <main className={usuario ? 'app-main' : 'app-main app-main-login'}>
        {!usuario && <LoginPage onLogin={setUsuario} />}
        {atual?.id === 'kanban' && <KanbanPage />}
        {atual?.id === 'fichas' && <ListarFichasPage />}
        {atual?.id === 'listar' && <ListarUsuariosPage />}
        {atual?.id === 'metricas' && <MetricasPage />}
      </main>
    </div>
  )
}

export default App
