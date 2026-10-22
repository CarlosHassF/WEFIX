const statusLabels = {
  novo: 'Novo',
  em_manutencao: 'Em manutenção',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  concertado: 'Consertado',
}

// formata o valor do serviço para R$ e trata valores nulos 
function formatarValor(valor) {
  if (valor == null || valor === '') return 'Não informado'
  return Number(valor).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL',})
}

function FichasTabela({ fichas, onEditar, onExcluir }) {
  return (
    <div className="tabela-container">
      <table className="tabela">
        <thead>
          <tr>
            <th>Número</th>
            <th>Cliente</th>
            <th>Telefone</th>
            <th>Valor do serviço</th>
            <th>Status</th>
            <th>Observações</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {fichas.map((ficha) => (
            <tr key={String(ficha.id_manutencao)}>
              <td>{String(ficha.id_manutencao ?? '—')}</td>
              <td>{ficha.nome_cliente || 'Não informado'}</td>
              <td>{ficha.numero_cliente || 'Não informado'}</td>
              <td>{formatarValor(ficha.valor_servico)}</td>
              <td><span className={`status status-${ficha.status || 'desconhecido'}`}>{statusLabels[ficha.status] || 'Desconhecido'}</span></td>
              <td className="observacao">{ficha.observacao || '—'}</td>
              <td><button type="button" onClick={() => onEditar(ficha)}>Editar</button> <button type="button" onClick={() => onExcluir(ficha)}>Excluir</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default FichasTabela
