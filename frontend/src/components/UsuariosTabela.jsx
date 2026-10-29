function UsuariosTabela({ usuarios, onAlternarAtivo }) {
  if (usuarios.length === 0) {
    return <p>Nenhum usuario cadastrado.</p>
  }

  return (
    <table className="tabela">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nome</th>
          <th>Email</th>
          <th>Cargo</th>
          <th>Ativo</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {usuarios.map((usuario) => (
          <tr key={String(usuario.id_usuario)}>
            <td>{String(usuario.id_usuario)}</td>
            <td>{usuario.nome_usuario}</td>
            <td>{usuario.email_usuario}</td>
            <td>{usuario.cargo_usuario}</td>
            <td>{usuario.ativo ? 'Sim' : 'Não'}</td>
            <td>
              <button type="button" onClick={() => onAlternarAtivo(usuario)}>
                {usuario.ativo ? 'Desativar' : 'Reativar'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default UsuariosTabela
