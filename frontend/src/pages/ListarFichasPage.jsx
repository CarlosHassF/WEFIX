import { useCallback, useEffect, useState } from 'react'
import FichasTabela from '../components/FichasTabela.jsx'
import { listarFichas, atualizarFicha, excluirFicha } from '../services/fichasService.js'
import FichaForm from '../components/FichaForm.jsx'

function ListarFichasPage() {
  const [fichas, setFichas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [fichaEditando, setFichaEditando] = useState(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [mensagemEdicao, setMensagemEdicao] = useState('')
  const [fichaParaExcluir, setFichaParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const resultado = await listarFichas()
      setFichas(Array.isArray(resultado) ? resultado : [])
    } catch (e) {
      setErro('Não foi possível carregar as ordens de serviço. Tente novamente.')
      console.error('Erro ao carregar ordens de serviço:', e)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvarEdicao(dados) {
    setSalvandoEdicao(true)
    setMensagemEdicao('')
    try {
      await atualizarFicha(fichaEditando.id_manutencao, dados)
      setFichaEditando(null)
      setMensagemEdicao('Ordem de serviço atualizada com sucesso!')
      await carregar()
      return true
    } catch (e) {
      console.error('Erro ao atualizar ordem de serviço:', e)
      setMensagemEdicao(`Não foi possível atualizar a ordem de serviço: ${e.message}`)
      return false
    } finally {
      setSalvandoEdicao(false)
    }
  }

  async function excluirOrdem() {
    if (!fichaParaExcluir) return
    setExcluindo(true)
    setMensagemEdicao('')
    try {
      await excluirFicha(fichaParaExcluir.id_manutencao)
      setMensagemEdicao(`Ordem de serviço #${fichaParaExcluir.id_manutencao} excluída com sucesso!`)
      if (String(fichaEditando?.id_manutencao) === String(fichaParaExcluir.id_manutencao)) setFichaEditando(null)
      setFichaParaExcluir(null)
      await carregar()
    } catch (e) {
      console.error('Erro ao excluir ordem de serviço:', e)
      setMensagemEdicao(`Não foi possível excluir a ordem de serviço: ${e.message}`)
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <section>
      <h2>Ordens de serviço</h2>
      {mensagemEdicao && <p role="status">{mensagemEdicao}</p>}
      {fichaEditando && (
        <div>
          <h3>Editando ordem de serviço #{fichaEditando.id_manutencao}</h3>
          <FichaForm key={String(fichaEditando.id_manutencao)} fichaInicial={fichaEditando} onSubmit={salvarEdicao} enviando={salvandoEdicao} aoCancelar={() => setFichaEditando(null)} />
        </div>
      )}
      {fichaParaExcluir && (
        <div className="modal-overlay" onClick={() => !excluindo && setFichaParaExcluir(null)}>
          <div className="modal-exclusao" role="dialog" aria-modal="true" aria-labelledby="titulo-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="titulo-modal">Excluir ordem de serviço?</h3>
            <p>Tem certeza de que deseja excluir a ordem de serviço #{fichaParaExcluir.id_manutencao}? Essa ação não poderá ser desfeita.</p>
            <div className="modal-acoes">
              <button type="button" onClick={() => setFichaParaExcluir(null)} disabled={excluindo}>Cancelar</button>
              <button type="button" className="botao-excluir" onClick={excluirOrdem} disabled={excluindo}>{excluindo ? 'Excluindo...' : 'Excluir'}</button>
            </div>
          </div>
        </div>
      )}
      <button onClick={carregar} disabled={carregando}>
        {carregando ? 'Atualizando...' : 'Atualizar lista'}
      </button>

      {carregando && (<p role="status">Carregando ordens de serviço...</p>)}
      {!carregando && erro && (<div className="erro" role="alert"><p>{erro}</p><button onClick={carregar}>Tentar novamente</button></div>)}
      {!carregando && !erro && fichas.length === 0 && (<div className="estado-vazio"><h3>Nenhuma ordem de serviço cadastrada</h3><p>Quando uma ordem de serviço for registrada, ela aparecerá aqui.</p></div>)}
      {!carregando && !erro && fichas.length > 0 && (<><p> {fichas.length === 1 ? '1 ordem de serviço cadastrada' : `${fichas.length} ordens de serviço cadastradas`}</p>
      <FichasTabela fichas={fichas} onEditar={(ficha) => { setMensagemEdicao(''); setFichaEditando(ficha) }} onExcluir={(ficha) => setFichaParaExcluir(ficha)} /></>)}
    </section>
  )
}

export default ListarFichasPage
