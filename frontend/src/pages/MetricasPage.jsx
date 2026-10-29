import { useCallback, useEffect, useState } from 'react'
import { listarFichas } from '../services/fichasService.js'
import { listarUsuarios } from '../services/usuariosService.js'
import { obterMetricasSupervisor } from '../services/metricasService.js'
import { STATUS_LABELS } from '../utils/statusFicha.js'
import '../styles/Metricas.css'

function dataLocal(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function filtrosIniciais() {
  const hoje = new Date()
  return {
    de: dataLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    ate: dataLocal(hoje),
    id_tecnico: '',
  }
}

function numero(valor, casas = 0) {
  if (valor == null) return '—'
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

function dataFormatada(valor) {
  if (!valor) return '—'
  return new Date(`${valor}T12:00:00`).toLocaleDateString('pt-BR')
}

function Tabela({
  titulo,
  colunas,
  linhas,
  vazio = 'Nenhum dado para o período.',
}) {
  return (
    <section className="metrica-bloco">
      <h3>{titulo}</h3>
      {linhas.length === 0 ? (
        <p className="metrica-vazio">{vazio}</p>
      ) : (
        <div className="tabela-container">
          <table className="tabela">
            <thead>
              <tr>
                {colunas.map((coluna) => (
                  <th key={coluna.titulo}>{coluna.titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, indice) => (
                <tr key={linha.chave ?? indice}>
                  {colunas.map((coluna) => (
                    <td key={coluna.titulo}>{coluna.valor(linha)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function MetricasPage() {
  const [filtros, setFiltros] = useState(filtrosIniciais)
  const [tecnicos, setTecnicos] = useState([])
  const [contagemFichas, setContagemFichas] = useState({})
  const [metricas, setMetricas] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async (valores) => {
    setCarregando(true)
    setErro('')
    try {
      const [resultado, usuarios, fichas] = await Promise.all([
        obterMetricasSupervisor(valores),
        listarUsuarios(),
        listarFichas(
          valores.id_tecnico ? { id_tecnico: valores.id_tecnico } : {}
        ),
      ])
      setContagemFichas(
        fichas.reduce((contagem, ficha) => {
          contagem[ficha.status] = (contagem[ficha.status] || 0) + 1
          return contagem
        }, {})
      )
      setMetricas(resultado)
      setTecnicos(
        usuarios.filter((usuario) => usuario.cargo_usuario === 'tecnico')
      )
    } catch (e) {
      setMetricas(null)
      setContagemFichas({})
      setErro(e.message || 'Não foi possível carregar as métricas.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar(filtrosIniciais())
  }, [carregar])

  function alterarFiltro(event) {
    const { name, value } = event.target
    setFiltros((atuais) => ({ ...atuais, [name]: value }))
  }

  function aplicarFiltros(event) {
    event.preventDefault()
    carregar(filtros)
  }

  const concluidas = metricas?.concluidas
  const totalConsertadas = (concluidas?.total || []).reduce(
    (soma, linha) => soma + linha.consertadas,
    0
  )
  const totalCanceladas = (concluidas?.total || []).reduce(
    (soma, linha) => soma + linha.canceladas,
    0
  )
  const prazos = metricas?.prazos
  const totalEventos = (prazos?.por_status || []).reduce(
    (soma, linha) => soma + linha.eventos,
    0
  )
  const totalExpirados = (prazos?.por_status || []).reduce(
    (soma, linha) => soma + linha.expirados,
    0
  )
  const percentualExpirado = totalEventos
    ? (totalExpirados / totalEventos) * 100
    : null
  const totalFichasAtuais = Object.values(contagemFichas).reduce(
    (total, quantidade) => total + quantidade,
    0
  )

  return (
    <section className="metricas-page">
      <div className="metricas-cabecalho">
        <div>
          <h2>Métricas do supervisor</h2>
          <p>
            Indicadores de conclusão, tempo por etapa e cumprimento dos prazos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => carregar(filtros)}
          disabled={carregando}
        >
          Atualizar
        </button>
      </div>

      <form className="metricas-filtros" onSubmit={aplicarFiltros}>
        <label>
          De
          <input
            type="date"
            name="de"
            value={filtros.de}
            onChange={alterarFiltro}
            required
          />
        </label>
        <label>
          Até
          <input
            type="date"
            name="ate"
            value={filtros.ate}
            onChange={alterarFiltro}
            min={filtros.de}
            required
          />
        </label>
        <label>
          Técnico
          <select
            name="id_tecnico"
            value={filtros.id_tecnico}
            onChange={alterarFiltro}
          >
            <option value="">Todos os técnicos</option>
            {tecnicos.map((tecnico) => (
              <option
                key={String(tecnico.id_usuario)}
                value={tecnico.id_usuario}
              >
                {tecnico.nome_usuario}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="botao-primario" disabled={carregando}>
          Aplicar filtros
        </button>
      </form>

      {erro && (
        <div className="erro" role="alert">
          <p>{erro}</p>
          <button
            type="button"
            onClick={() => carregar(filtros)}
            disabled={carregando}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {carregando && <p role="status">Carregando métricas...</p>}

      {!carregando && metricas && (
        <>
          <div className="metricas-resumo">
            <article>
              <span>Ordens consertadas</span>
              <strong>{numero(totalConsertadas)}</strong>
            </article>
            <article>
              <span>Ordens canceladas</span>
              <strong>{numero(totalCanceladas)}</strong>
            </article>
            <article>
              <span>Tempo mediano até o conserto</span>
              <strong>
                {metricas.tempoTotal.total.mediana_horas == null
                  ? '—'
                  : `${numero(metricas.tempoTotal.total.mediana_horas, 2)} h`}
              </strong>
            </article>
            <article>
              <span>Etapas fora do prazo</span>
              <strong>
                {percentualExpirado == null
                  ? '—'
                  : `${numero(percentualExpirado, 2)}%`}
              </strong>
            </article>
          </div>

          <section className="metricas-bloco-status">
            <div className="metrica-secao-cabecalho">
              <div>
                <h3>Fichas por status</h3>
                <p>Visão atual, considerando o técnico selecionado.</p>
              </div>
              <span className="metricas-total-status">
                {numero(totalFichasAtuais)} fichas
              </span>
            </div>
            <div className="metricas-status-grid">
              {Object.entries(STATUS_LABELS).map(([status, titulo]) => (
                <article
                  className={`metricas-status metricas-status--${status}`}
                  key={status}
                >
                  <span>{titulo}</span>
                  <strong>{numero(contagemFichas[status] || 0)}</strong>
                </article>
              ))}
            </div>
          </section>

          <Tabela
            titulo="Conclusões por dia"
            linhas={concluidas.total.map((linha) => ({
              ...linha,
              chave: linha.dia,
            }))}
            colunas={[
              { titulo: 'Dia', valor: (linha) => dataFormatada(linha.dia) },
              {
                titulo: 'Consertadas',
                valor: (linha) => numero(linha.consertadas),
              },
              {
                titulo: 'Canceladas',
                valor: (linha) => numero(linha.canceladas),
              },
            ]}
          />
          <Tabela
            titulo="Conclusões por técnico"
            linhas={concluidas.por_tecnico}
            colunas={[
              { titulo: 'Técnico', valor: (linha) => linha.nome_tecnico },
              { titulo: 'Dia', valor: (linha) => dataFormatada(linha.dia) },
              {
                titulo: 'Consertadas',
                valor: (linha) => numero(linha.consertadas),
              },
              {
                titulo: 'Canceladas',
                valor: (linha) => numero(linha.canceladas),
              },
            ]}
          />
          <Tabela
            titulo="Tempo por status (horas)"
            linhas={metricas.tempoPorStatus}
            colunas={[
              {
                titulo: 'Status',
                valor: (linha) => linha.status.replaceAll('_', ' '),
              },
              { titulo: 'Fichas', valor: (linha) => numero(linha.fichas) },
              {
                titulo: 'Média',
                valor: (linha) => numero(linha.media_horas, 2),
              },
              {
                titulo: 'Mediana',
                valor: (linha) => numero(linha.mediana_horas, 2),
              },
              {
                titulo: 'Máximo',
                valor: (linha) => numero(linha.max_horas, 2),
              },
            ]}
          />
          <Tabela
            titulo="Tempo total até o conserto (horas)"
            linhas={metricas.tempoTotal.por_tecnico}
            colunas={[
              { titulo: 'Técnico', valor: (linha) => linha.nome_tecnico },
              { titulo: 'Fichas', valor: (linha) => numero(linha.fichas) },
              {
                titulo: 'Média',
                valor: (linha) => numero(linha.media_horas, 2),
              },
              {
                titulo: 'Mediana',
                valor: (linha) => numero(linha.mediana_horas, 2),
              },
            ]}
          />
          <Tabela
            titulo="Prazos por status"
            linhas={prazos.por_status}
            colunas={[
              {
                titulo: 'Status',
                valor: (linha) => linha.status.replaceAll('_', ' '),
              },
              { titulo: 'Etapas', valor: (linha) => numero(linha.eventos) },
              {
                titulo: 'Expiradas',
                valor: (linha) => numero(linha.expirados),
              },
              {
                titulo: 'Percentual',
                valor: (linha) => `${numero(linha.percentual, 2)}%`,
              },
            ]}
          />
          <Tabela
            titulo="Prazos por técnico"
            linhas={prazos.por_tecnico}
            colunas={[
              { titulo: 'Técnico', valor: (linha) => linha.nome_tecnico },
              { titulo: 'Etapas', valor: (linha) => numero(linha.eventos) },
              {
                titulo: 'Expiradas',
                valor: (linha) => numero(linha.expirados),
              },
              {
                titulo: 'Percentual',
                valor: (linha) => `${numero(linha.percentual, 2)}%`,
              },
            ]}
          />
          <Tabela
            titulo="Ordens atualmente atrasadas"
            linhas={prazos.fichas_atrasadas.map((linha) => ({
              ...linha,
              chave: String(linha.id_manutencao),
              nome_tecnico:
                tecnicos.find(
                  (tecnico) =>
                    String(tecnico.id_usuario) === String(linha.id_tecnico)
                )?.nome_usuario || 'Sem técnico',
            }))}
            colunas={[
              { titulo: 'Ordem', valor: (linha) => `#${linha.id_manutencao}` },
              {
                titulo: 'Status',
                valor: (linha) => linha.status.replaceAll('_', ' '),
              },
              {
                titulo: 'Prazo',
                valor: (linha) =>
                  new Date(linha.prazo_limite).toLocaleString('pt-BR'),
              },
              { titulo: 'Técnico', valor: (linha) => linha.nome_tecnico },
            ]}
          />
        </>
      )}
    </section>
  )
}

export default MetricasPage
