import { useEffect, useState } from 'react'
import { listarFichas, atualizarStatusFicha } from '../services/fichasService.js'
import { obterUsuario } from '../services/authService.js'
import StatusFichaModal from '../components/StatusFichaModal.jsx'
import {
  COLUNAS_KANBAN,
  STATUS_LABELS,
  rotuloAcao,
  descricaoDispositivo,
  formatarTelefone,
  formatarValor,
  nomeCliente,
  telefoneCliente,
  transicoesDoUsuario,
} from '../utils/statusFicha.js'
import '../styles/Kanban.css'

function KanbanPage() {
  const usuario = obterUsuario()
  const [fichas, setFichas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [movendo, setMovendo] = useState(null)
  const [pendente, setPendente] = useState(null)

  async function carregarFichas() {
    setCarregando(true)
    setErro('')
    try {
      const resultado = await listarFichas()
      setFichas(Array.isArray(resultado) ? resultado : [])
    } catch (e) {
      setErro(e.message || 'Não foi possível carregar as fichas.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarFichas()
  }, [])

  function transicaoPara(ficha, novoStatus) {
    return transicoesDoUsuario(ficha, usuario).find((item) => item.para === novoStatus)
  }

  async function aplicarStatus(ficha, transicao, extras = {}) {
    const id = String(ficha.id_manutencao)
    const statusAnterior = ficha.status
    setMovendo(id)
    setErro('')
    setFichas((atuais) =>
      atuais.map((item) =>
        String(item.id_manutencao) === id ? { ...item, status: transicao.para } : item
      )
    )
    try {
      await atualizarStatusFicha(ficha.id_manutencao, transicao.para, extras)
      const resultado = await listarFichas()
      setFichas(Array.isArray(resultado) ? resultado : [])
    } catch (e) {
      setFichas((atuais) =>
        atuais.map((item) =>
          String(item.id_manutencao) === id ? { ...item, status: statusAnterior } : item
        )
      )
      setErro(e.message || 'Não foi possível atualizar o status da ficha.')
    } finally {
      setMovendo(null)
      setPendente(null)
    }
  }

  function iniciarMovimento(ficha, novoStatus) {
    if (ficha.status === novoStatus || movendo !== null) return
    const transicao = transicaoPara(ficha, novoStatus)
    if (!transicao) {
      setErro(
        `Transição de ${STATUS_LABELS[ficha.status]} para ${STATUS_LABELS[novoStatus] || novoStatus} não é permitida para o seu cargo.`
      )
      return
    }
    if ((transicao.exige || []).length > 0 || transicao.para === 'cancelado') {
      setPendente({ ficha, transicao })
      return
    }
    aplicarStatus(ficha, transicao)
  }

  function iniciarArraste(event, id) {
    event.dataTransfer.setData('text/plain', String(id))
    event.dataTransfer.effectAllowed = 'move'
  }

  function soltarFicha(event, status) {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/plain')
    const ficha = fichas.find((item) => String(item.id_manutencao) === String(id))
    if (ficha) iniciarMovimento(ficha, status)
  }

  return (
    <section className="kanban-page">
      <div className="kanban-cabecalho">
        <div>
          <h2>Ordens de serviço</h2>
          <p>Arraste ou use as ações permitidas pelo seu cargo. O cliente aprova o orçamento pelo WhatsApp (n8n); o admin pode aprovar manualmente.</p>
        </div>
        <button type="button" onClick={carregarFichas} disabled={carregando || movendo !== null}>
          Atualizar
        </button>
      </div>

      {erro && <p className="kanban-erro">{erro}</p>}
      {carregando ? (
        <p>Carregando fichas...</p>
      ) : (
        <div className="kanban-colunas">
          {COLUNAS_KANBAN.map((coluna) => {
            const fichasColuna = fichas.filter((ficha) => ficha.status === coluna.status)
            return (
              <section
                key={coluna.status}
                className="kanban-coluna"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => soltarFicha(event, coluna.status)}
              >
                <div className="kanban-coluna-cabecalho">
                  <h3>{coluna.titulo}</h3>
                  <span>{fichasColuna.length}</span>
                </div>
                <div className="kanban-cartoes">
                  {fichasColuna.map((ficha) => {
                    const acoes = transicoesDoUsuario(ficha, usuario)
                    return (
                      <article
                        key={String(ficha.id_manutencao)}
                        className={`kanban-cartao ${movendo === String(ficha.id_manutencao) ? 'kanban-movendo' : ''}`}
                        draggable={movendo === null && acoes.length > 0}
                        onDragStart={(event) => iniciarArraste(event, ficha.id_manutencao)}
                      >
                        <span className="kanban-ficha-id">#{String(ficha.id_manutencao)}</span>
                        <h4 className="kanban-cliente">{nomeCliente(ficha)}</h4>
                        <p className="kanban-telefone">{formatarTelefone(telefoneCliente(ficha))}</p>
                        <p>{descricaoDispositivo(ficha)}</p>
                        <p className="kanban-observacao">{ficha.defeito_relatado || 'Sem defeito informado'}</p>
                        <p className="kanban-valor">{formatarValor(ficha.valor_servico)}</p>
                        {ficha.etapa_atual?.expirado && <p className="kanban-atrasada">Prazo estourado</p>}
                        {acoes.length > 0 && (
                          <div className="kanban-acoes">
                            {acoes.map((acao) => (
                              <button
                                key={acao.para}
                                type="button"
                                disabled={movendo !== null}
                                onClick={() => iniciarMovimento(ficha, acao.para)}
                              >
                                {rotuloAcao(acao)}
                              </button>
                            ))}
                          </div>
                        )}
                      </article>
                    )
                  })}
                  {fichasColuna.length === 0 && <p className="kanban-vazio">Nenhuma ficha nesta coluna.</p>}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {pendente && (
        <StatusFichaModal
          ficha={pendente.ficha}
          transicao={pendente.transicao}
          enviando={movendo !== null}
          onClose={() => setPendente(null)}
          onConfirm={(extras) => aplicarStatus(pendente.ficha, pendente.transicao, extras)}
        />
      )}
    </section>
  )
}

export default KanbanPage
