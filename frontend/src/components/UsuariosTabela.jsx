// componente "burro": so recebe a lista por props e desenha a tabela
function UsuariosTabela({ usuarios }) {
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
        </tr>
      </thead>
      <tbody>
        {usuarios.map((usuario) => (
          // key ajuda o React a saber qual linha mudou
          <tr key={usuario.id_usuario}>
            <td>{usuario.id_usuario}</td>
            <td>{usuario.nome_usuario}</td>
            <td>{usuario.email_usuario}</td>
            <td>{usuario.cargo_usuario}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default UsuariosTabela
