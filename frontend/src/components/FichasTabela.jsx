import { useMemo, useState } from 'react'
import FiltrosModal from './FiltrosModal.jsx'
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
  const [filtros, setFiltros] = useState({
    numero: '',
    cliente: '',
    whatsapp: '',
    dispositivo: '',
    valor: '',
    status: '',
    defeito: '',
  })
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const camposFiltro = [
    { nome: 'numero', rotulo: 'Número da ordem' },
    { nome: 'cliente', rotulo: 'Cliente' },
    { nome: 'whatsapp', rotulo: 'WhatsApp' },
    { nome: 'dispositivo', rotulo: 'Dispositivo' },
    { nome: 'valor', rotulo: 'Valor' },
    {
      nome: 'status',
      rotulo: 'Status',
      opcoes: [
        ...Object.entries(STATUS_LABELS).map(([, titulo]) => ({
          valor: titulo,
          rotulo: titulo,
        })),
        { valor: 'Desconhecido', rotulo: 'Desconhecido' },
      ],
    },
    { nome: 'defeito', rotulo: 'Defeito relatado' },
  ]

  const fichasFiltradas = useMemo(
    () =>
      fichas.filter((ficha) => {
        const campos = {
          numero: String(ficha.id_manutencao ?? ''),
          cliente: nomeCliente(ficha),
          whatsapp: formatarTelefone(telefoneCliente(ficha)),
          dispositivo: descricaoDispositivo(ficha),
          valor: formatarValor(ficha.valor_servico),
          status: STATUS_LABELS[ficha.status] || 'Desconhecido',
          defeito: ficha.defeito_relatado || '',
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
    [fichas, filtros]
  )

  return (
    <>
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
              <th>
                <span className="tabela-filtro-titulo">
                  Ações
                  <button
                    type="button"
                    className={`botao-icone-filtro ${Object.values(filtros).some(Boolean) ? 'com-filtro' : ''}`}
                    onClick={() => setFiltrosAbertos(true)}
                    aria-label="Abrir filtros das ordens de serviço"
                    title="Filtrar ordens de serviço"
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
            {fichasFiltradas.map((ficha) => {
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
                    <span
                      className={`status status-${ficha.status || 'desconhecido'}`}
                    >
                      {STATUS_LABELS[ficha.status] || 'Desconhecido'}
                    </span>
                    {ficha.etapa_atual?.expirado ? ' (atrasada)' : ''}
                  </td>
                  <td className="observacao">
                    {ficha.defeito_relatado || '—'}
                  </td>
                  <td>
                    {editar && (
                      <button type="button" onClick={() => onEditar(ficha)}>
                        Editar
                      </button>
                    )}
                    {acoes.map((acao) => (
                      <button
                        key={acao.para}
                        type="button"
                        onClick={() => onAcao(ficha, acao)}
                      >
                        {rotuloAcao(acao)}
                      </button>
                    ))}
                  </td>
                </tr>
              )
            })}
            {fichasFiltradas.length === 0 && (
              <tr>
                <td className="tabela-sem-resultados" colSpan="8">
                  Nenhuma ordem corresponde aos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtrosAbertos && (
        <FiltrosModal
          campos={camposFiltro}
          valores={filtros}
          onFechar={() => setFiltrosAbertos(false)}
          onAplicar={setFiltros}
        />
      )}
    </>
  )
}

export default FichasTabela
