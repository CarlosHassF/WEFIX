import { useCallback, useEffect, useState } from 'react'
import FichasTabela from '../components/FichasTabela.jsx'
import FichaForm from '../components/FichaForm.jsx'
import StatusFichaModal from '../components/StatusFichaModal.jsx'
import { listarFichas, atualizarFicha, atualizarStatusFicha } from '../services/fichasService.js'
import { obterUsuario } from '../services/authService.js'
import { STATUS_FINAIS, transicoesDoUsuario } from '../utils/statusFicha.js'

function ListarFichasPage() {
  const usuario = obterUsuario()
  const [fichas, setFichas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [fichaEditando, setFichaEditando] = useState(null)
  const [modoEdicao, setModoEdicao] = useState('entrada')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [mensagemEdicao, setMensagemEdicao] = useState('')
  const [pendente, setPendente] = useState(null)

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

  function podeEditar(ficha) {
    if (!usuario || STATUS_FINAIS.includes(ficha.status)) return false
    if (['atendente', 'admin'].includes(usuario.cargo)) return true
    return (
      usuario.cargo === 'tecnico' &&
      ficha.status === 'em_analise' &&
      String(ficha.id_tecnico) === String(usuario.id)
    )
  }

  function abrirEdicao(ficha) {
    setMensagemEdicao('')
    setModoEdicao(
      usuario?.cargo === 'tecnico' && ficha.status === 'em_analise' ? 'diagnostico' : 'entrada'
    )
    setFichaEditando(ficha)
  }

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

  async function confirmarStatus(extras) {
    try {
      await atualizarStatusFicha(pendente.ficha.id_manutencao, pendente.transicao.para, extras)
      setMensagemEdicao(`Ordem #${pendente.ficha.id_manutencao} atualizada para ${pendente.transicao.para}.`)
      setPendente(null)
      if (String(fichaEditando?.id_manutencao) === String(pendente.ficha.id_manutencao)) {
        setFichaEditando(null)
      }
      await carregar()
    } catch (e) {
      setMensagemEdicao(e.message)
    }
  }

  return (
    <section>
      <h2>Ordens de serviço</h2>
      {mensagemEdicao && <p role="status">{mensagemEdicao}</p>}
      {fichaEditando && (
        <div>
          <h3>Editando ordem de serviço #{fichaEditando.id_manutencao}</h3>
          <FichaForm
            key={`${fichaEditando.id_manutencao}-${modoEdicao}`}
            fichaInicial={fichaEditando}
            modo={modoEdicao}
            onSubmit={salvarEdicao}
            enviando={salvandoEdicao}
            aoCancelar={() => setFichaEditando(null)}
          />
        </div>
      )}
      <button onClick={carregar} disabled={carregando}>
        {carregando ? 'Atualizando...' : 'Atualizar lista'}
      </button>

      {carregando && <p role="status">Carregando ordens de serviço...</p>}
      {!carregando && erro && (
        <div className="erro" role="alert">
          <p>{erro}</p>
          <button onClick={carregar}>Tentar novamente</button>
        </div>
      )}
      {!carregando && !erro && fichas.length === 0 && (
        <div className="estado-vazio">
          <h3>Nenhuma ordem de serviço cadastrada</h3>
          <p>Quando uma ordem de serviço for registrada, ela aparecerá aqui.</p>
        </div>
      )}
      {!carregando && !erro && fichas.length > 0 && (
        <>
          <p>
            {fichas.length === 1
              ? '1 ordem de serviço cadastrada'
              : `${fichas.length} ordens de serviço cadastradas`}
          </p>
          <FichasTabela
            fichas={fichas}
            onEditar={abrirEdicao}
            podeEditar={podeEditar}
            acoesDe={(ficha) => transicoesDoUsuario(ficha, usuario)}
            onAcao={(ficha, transicao) => setPendente({ ficha, transicao })}
          />
        </>
      )}
      {pendente && (
        <StatusFichaModal
          ficha={pendente.ficha}
          transicao={pendente.transicao}
          enviando={false}
          onClose={() => setPendente(null)}
          onConfirm={confirmarStatus}
        />
      )}
    </section>
  )
}

export default ListarFichasPage
