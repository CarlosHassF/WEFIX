import { useCallback, useEffect, useState } from 'react'
import FichasTabela from '../components/FichasTabela.jsx'
import FichaForm from '../components/FichaForm.jsx'
import Modal from '../components/Modal.jsx'
import Notificacao from '../components/Notificacao.jsx'
import StatusFichaModal from '../components/StatusFichaModal.jsx'
import {
  listarFichas,
  registrarOrdem,
  atualizarFicha,
  atualizarStatusFicha,
} from '../services/fichasService.js'
import { obterUsuario } from '../services/authService.js'
import { STATUS_FINAIS, transicoesDoUsuario } from '../utils/statusFicha.js'

function ListarFichasPage() {
  const usuario = obterUsuario()
  const [fichas, setFichas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [notificacao, setNotificacao] = useState(null)
  const [pendente, setPendente] = useState(null)

  // estados do modal do formulário (criar ou editar)
  const [criando, setCriando] = useState(false)
  const [fichaEditando, setFichaEditando] = useState(null)
  const [modoEdicao, setModoEdicao] = useState('entrada')
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState('') // erro dentro do modal, não esconde a tabela
  const modalAberto = criando || fichaEditando !== null

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const resultado = await listarFichas()
      setFichas(Array.isArray(resultado) ? resultado : [])
    } catch (e) {
      setErro(
        'Não foi possível carregar as ordens de serviço. Tente novamente.'
      )
      console.error('Erro ao carregar ordens de serviço:', e)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // mesma regra de quem pode registrar entrada de aparelho que a edição usa
  const podeCriar = ['atendente', 'admin'].includes(usuario?.cargo)

  function podeEditar(ficha) {
    if (!usuario || STATUS_FINAIS.includes(ficha.status)) return false
    if (['atendente', 'admin'].includes(usuario.cargo)) return true
    return (
      usuario.cargo === 'tecnico' &&
      ficha.status === 'em_analise' &&
      String(ficha.id_tecnico) === String(usuario.id)
    )
  }

  function abrirCriacao() {
    setErroModal('')
    setMensagem('')
    setCriando(true)
  }

  function abrirEdicao(ficha) {
    setErroModal('')
    setMensagem('')
    setModoEdicao(
      usuario?.cargo === 'tecnico' && ficha.status === 'em_analise'
        ? 'diagnostico'
        : 'entrada'
    )
    setFichaEditando(ficha)
  }

  function fecharModal() {
    setCriando(false)
    setFichaEditando(null)
  }

  // o FichaForm espera true (deu certo) ou false (falhou) para limpar o formulário
  async function criarNova(dados) {
    setSalvando(true)
    setErroModal('')
    try {
      const nova = await registrarOrdem(dados) // cria cliente, dispositivo e ordem
      setMensagem(
        nova?.id_manutencao
          ? `Ordem de serviço #${nova.id_manutencao} registrada com sucesso!`
          : 'Ordem de serviço registrada com sucesso!'
      )
      setNotificacao({
        tipo: 'sucesso',
        mensagem: nova?.id_manutencao
          ? `Ficha #${nova.id_manutencao} criada com sucesso.`
          : 'Ficha criada com sucesso.',
      })
      fecharModal()
      await carregar()
      return true
    } catch (e) {
      console.error('Erro ao registrar ordem de serviço:', e)
      setErroModal(
        `Não foi possível registrar a ordem de serviço: ${e.message}`
      )
      setNotificacao({
        tipo: 'erro',
        mensagem: e.message || 'Não foi possível criar a ficha.',
      })
      return false
    } finally {
      setSalvando(false)
    }
  }

  async function salvarEdicao(dados) {
    setSalvando(true)
    setErroModal('')
    try {
      await atualizarFicha(fichaEditando.id_manutencao, dados)
      fecharModal()
      setMensagem('Ordem de serviço atualizada com sucesso!')
      await carregar()
      return true
    } catch (e) {
      console.error('Erro ao atualizar ordem de serviço:', e)
      setErroModal(
        `Não foi possível atualizar a ordem de serviço: ${e.message}`
      )
      return false
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarStatus(extras) {
    try {
      await atualizarStatusFicha(
        pendente.ficha.id_manutencao,
        pendente.transicao.para,
        extras
      )
      setMensagem(
        `Ordem #${pendente.ficha.id_manutencao} atualizada para ${pendente.transicao.para}.`
      )
      setPendente(null)
      if (
        String(fichaEditando?.id_manutencao) ===
        String(pendente.ficha.id_manutencao)
      ) {
        setFichaEditando(null)
      }
      await carregar()
    } catch (e) {
      setMensagem(e.message)
    }
  }

  return (
    <section>
      <Notificacao
        notificacao={notificacao}
        aoFechar={() => setNotificacao(null)}
      />
      <h2>Ordens de serviço</h2>

      <div className="barra-acoes">
        {podeCriar && (
          <button
            type="button"
            className="botao-primario"
            onClick={abrirCriacao}
          >
            Nova ordem de serviço
          </button>
        )}
        <button type="button" onClick={carregar} disabled={carregando}>
          {carregando ? 'Atualizando...' : 'Atualizar lista'}
        </button>
      </div>

      {mensagem && <p role="status">{mensagem}</p>}

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

      {modalAberto && (
        <Modal
          largo
          titulo={
            criando
              ? 'Nova ordem de serviço'
              : `Editando ordem de serviço #${fichaEditando.id_manutencao}`
          }
          onFechar={fecharModal}
          bloqueado={salvando}
        >
          {erroModal && <p className="erro">{erroModal}</p>}
          <FichaForm
            key={
              criando ? 'nova' : `${fichaEditando.id_manutencao}-${modoEdicao}`
            }
            fichaInicial={criando ? null : fichaEditando}
            modo={criando ? 'criar' : modoEdicao}
            onSubmit={criando ? criarNova : salvarEdicao}
            enviando={salvando}
            aoCancelar={fecharModal}
          />
        </Modal>
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
