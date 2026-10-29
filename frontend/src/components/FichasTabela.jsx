import {
  STATUS_LABELS,
  rotuloAcao,
  descricaoDispositivo,
  formatarTelefone,
  formatarValor,
  nomeCliente,
  telefoneCliente,
} from '../utils/statusFicha.js'

function FichasTabela({ fichas, onEditar, onAcao, podeEditar, acoesDe }) {
  return (
    <div className="tabela-container">
      <table className="tabela">
        <thead>
          <tr>
            <th>Número</th>
            <th>Cliente</th>
            <th>WhatsApp</th>
            <th>Dispositivo</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Defeito</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {fichas.map((ficha) => {
            const acoes = acoesDe ? acoesDe(ficha) : []
            const editar = podeEditar ? podeEditar(ficha) : false
            return (
              <tr key={String(ficha.id_manutencao)}>
                <td>{String(ficha.id_manutencao ?? '—')}</td>
                <td>{nomeCliente(ficha)}</td>
                <td>{formatarTelefone(telefoneCliente(ficha))}</td>
                <td>{descricaoDispositivo(ficha)}</td>
                <td>{formatarValor(ficha.valor_servico)}</td>
                <td>
                  <span className={`status status-${ficha.status || 'desconhecido'}`}>
                    {STATUS_LABELS[ficha.status] || 'Desconhecido'}
                  </span>
                  {ficha.etapa_atual?.expirado ? ' (atrasada)' : ''}
                </td>
                <td className="observacao">{ficha.defeito_relatado || '—'}</td>
                <td>
                  {editar && (
                    <button type="button" onClick={() => onEditar(ficha)}>
                      Editar
                    </button>
                  )}
                  {acoes.map((acao) => (
                    <button key={acao.para} type="button" onClick={() => onAcao(ficha, acao)}>
                      {rotuloAcao(acao)}
                    </button>
                  ))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default FichasTabela
