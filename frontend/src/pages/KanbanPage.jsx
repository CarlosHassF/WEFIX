import { useEffect, useState } from 'react'
import { listarFichas, atualizarStatusFicha } from '../services/fichasService.js'
import '../styles/Kanban.css'

const colunas = [
  { status: 'novo', titulo: 'Novo' },
  { status: 'em_manutencao', titulo: 'Em manutenção' },
  { status: 'concertado', titulo: 'Consertado' },
  { status: 'entregue', titulo: 'Entregue' },
  { status: 'cancelado', titulo: 'Cancelado' },
]

function formatarValor(valor) {
  if (valor == null || valor === '') return 'Não informado'
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function KanbanPage() {
  const [fichas, setFichas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [movendo, setMovendo] = useState(null)

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

  async function moverFicha(id, novoStatus) {
    const ficha = fichas.find(item => String(item.id_manutencao) === String(id))
    if (!ficha || ficha.status === novoStatus || movendo !== null) return

    const statusAnterior = ficha.status
    setMovendo(String(id))
    setErro('')
    setFichas(atuais => atuais.map(item =>
      String(item.id_manutencao) === String(id) ? { ...item, status: novoStatus } : item
    ))

    try {
      await atualizarStatusFicha(id, novoStatus)
    } catch (e) {
      setFichas(atuais => atuais.map(item =>
        String(item.id_manutencao) === String(id) ? { ...item, status: statusAnterior } : item
      ))
      setErro(e.message || 'Não foi possível atualizar o status da ficha.')
    } finally {
      setMovendo(null)
    }
  }

  function iniciarArraste(event, id) {
    event.dataTransfer.setData('text/plain', String(id))
    event.dataTransfer.effectAllowed = 'move'
  }

  function soltarFicha(event, status) {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/plain')
    if (id) moverFicha(id, status)
  }

  return (
    <section className="kanban-page">
      <div className="kanban-cabecalho">
        <div>
          <h2>Ordens de serviço</h2>
          <p>Acompanhe as fichas por status.</p>
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
          {colunas.map(coluna => {
            const fichasColuna = fichas.filter(ficha => ficha.status === coluna.status)

            return (
              <section
                key={coluna.status}
                className="kanban-coluna"
                onDragOver={event => event.preventDefault()}
                onDrop={event => soltarFicha(event, coluna.status)}
              >
                <div className="kanban-coluna-cabecalho">
                  <h3>{coluna.titulo}</h3>
                  <span>{fichasColuna.length}</span>
                </div>

                <div className="kanban-cartoes">
                  {fichasColuna.map(ficha => (
                    <article
                      key={String(ficha.id_manutencao)}
                      className={`kanban-cartao ${movendo === String(ficha.id_manutencao) ? 'kanban-movendo' : ''}`}
                      draggable={movendo === null}
                      onDragStart={event => iniciarArraste(event, ficha.id_manutencao)}
                    >
                      <span className="kanban-ficha-id">#{String(ficha.id_manutencao)}</span>
                      <h4 className="kanban-cliente">{ficha.nome_cliente || 'Cliente não informado'}</h4>
                      <p className="kanban-telefone">{ficha.numero_cliente || 'Telefone não informado'}</p>
                      <p className="kanban-observacao">{ficha.observacao || 'Sem observações'}</p>
                      <p className="kanban-valor">{formatarValor(ficha.valor_servico)}</p>
                    </article>
                  ))}

                  {fichasColuna.length === 0 && <p className="kanban-vazio">Nenhuma ficha nesta coluna.</p>}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default KanbanPage
