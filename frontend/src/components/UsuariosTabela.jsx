import { useMemo, useState } from 'react'
import FiltrosModal from './FiltrosModal.jsx'

function UsuariosTabela({ usuarios, onAlternarAtivo }) {
  const [filtros, setFiltros] = useState({
    id: '',
    nome: '',
    email: '',
    cargo: '',
    ativo: '',
  })
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const camposFiltro = [
    { nome: 'id', rotulo: 'ID do usuário' },
    { nome: 'nome', rotulo: 'Nome' },
    { nome: 'email', rotulo: 'Email' },
    {
      nome: 'cargo',
      rotulo: 'Cargo',
      opcoes: ['admin', 'atendente', 'tecnico'].map((cargo) => ({
        valor: cargo,
        rotulo: cargo,
      })),
    },
    {
      nome: 'ativo',
      rotulo: 'Situação',
      opcoes: [
        { valor: 'Ativo', rotulo: 'Ativo' },
        { valor: 'Inativo', rotulo: 'Inativo' },
      ],
    },
  ]

  const usuariosFiltrados = useMemo(
    () =>
      usuarios.filter((usuario) => {
        const campos = {
          id: String(usuario.id_usuario),
          nome: usuario.nome_usuario,
          email: usuario.email_usuario,
          cargo: usuario.cargo_usuario,
          ativo: usuario.ativo ? 'Ativo' : 'Inativo',
        }

        return Object.entries(filtros).every(([campo, filtro]) => {
          const texto = String(campos[campo])
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase()
          const busca = filtro
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase()
          return texto.includes(busca)
        })
      }),
    [usuarios, filtros]
  )

  if (usuarios.length === 0) {
    return <p>Nenhum usuario cadastrado.</p>
  }

  return (
    <div className="tabela-container">
      <table className="tabela">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Email</th>
            <th>Cargo</th>
            <th>Ativo</th>
            <th>
              <span className="tabela-filtro-titulo">
                Ações
                <button
                  type="button"
                  className={`botao-icone-filtro ${Object.values(filtros).some(Boolean) ? 'com-filtro' : ''}`}
                  onClick={() => setFiltrosAbertos(true)}
                  aria-label="Abrir filtros dos usuários"
                  title="Filtrar usuários"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 5h16l-6.5 7.5v5L10.5 20v-7.5L4 5z" />
                  </svg>
                </button>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {usuariosFiltrados.map((usuario) => (
            <tr key={String(usuario.id_usuario)}>
              <td>{String(usuario.id_usuario)}</td>
              <td>{usuario.nome_usuario}</td>
              <td>{usuario.email_usuario}</td>
              <td>{usuario.cargo_usuario}</td>
              <td>
                <span
                  className={`usuario-status ${usuario.ativo ? 'usuario-status-ativo' : 'usuario-status-inativo'}`}
                  aria-label={usuario.ativo ? 'Ativo' : 'Inativo'}
                  title={usuario.ativo ? 'Ativo' : 'Inativo'}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {usuario.ativo ? (
                      <path d="m4 10 4 4 8-8" />
                    ) : (
                      <>
                        <path d="m5 5 10 10" />
                        <path d="m15 5-10 10" />
                      </>
                    )}
                  </svg>
                  <span>{usuario.ativo ? 'Ativo' : 'Inativo'}</span>
                </span>
              </td>
              <td>
                <button type="button" onClick={() => onAlternarAtivo(usuario)}>
                  {usuario.ativo ? 'Desativar' : 'Reativar'}
                </button>
              </td>
            </tr>
          ))}
          {usuariosFiltrados.length === 0 && (
            <tr>
              <td className="tabela-sem-resultados" colSpan="6">
                Nenhum usuário corresponde aos filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {filtrosAbertos && (
        <FiltrosModal
          campos={camposFiltro}
          valores={filtros}
          onFechar={() => setFiltrosAbertos(false)}
          onAplicar={setFiltros}
        />
      )}
    </div>
  )
}

export default UsuariosTabela
