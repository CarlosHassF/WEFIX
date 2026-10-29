import { useEffect, useState } from 'react'
import Modal from '../components/Modal.jsx'
import Notificacao from '../components/Notificacao.jsx'
import UsuarioForm from '../components/UsuarioForm.jsx'
import UsuariosTabela from '../components/UsuariosTabela.jsx'
import {
  alterarAtivoUsuario,
  criarUsuario,
  listarUsuarios,
} from '../services/usuariosService.js'

function ListarUsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  // estados do modal de criação (erro separado, para não esconder a tabela)
  const [modalAberto, setModalAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erroCriar, setErroCriar] = useState(null)
  const [mensagem, setMensagem] = useState(null)
  const [notificacao, setNotificacao] = useState(null)

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      setUsuarios(await listarUsuarios())
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function alternarAtivo(usuario) {
    try {
      const ativo = !usuario.ativo
      await alterarAtivoUsuario(usuario.id_usuario, ativo)
      await carregar()
      setNotificacao({
        tipo: 'sucesso',
        mensagem: `Usuário ${usuario.nome_usuario} ${ativo ? 'ativado' : 'inativado'} com sucesso.`,
      })
    } catch (e) {
      setNotificacao({
        tipo: 'erro',
        mensagem: e.message || 'Não foi possível alterar o status do usuário.',
      })
    }
  }

  function abrirModal() {
    setErroCriar(null)
    setMensagem(null)
    setModalAberto(true)
  }

  // o UsuarioForm espera true (deu certo) ou false (falhou) para limpar o formulário
  async function handleCriar(dados) {
    setEnviando(true)
    setErroCriar(null)

    try {
      const resposta = await criarUsuario(dados)
      const nome = resposta?.nome_usuario || dados.nome_usuario
      const cargo = resposta?.cargo_usuario || dados.cargo_usuario
      setMensagem(`Usuário ${nome} criado com cargo ${cargo}.`)
      setNotificacao({
        tipo: 'sucesso',
        mensagem: `Usuário ${nome} criado com sucesso.`,
      })
      setModalAberto(false)
      await carregar() // a lista já mostra o usuário novo
      return true
    } catch (e) {
      setErroCriar(e.message)
      setNotificacao({
        tipo: 'erro',
        mensagem: e.message || 'Não foi possível criar o usuário.',
      })
      return false
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section>
      <Notificacao
        notificacao={notificacao}
        aoFechar={() => setNotificacao(null)}
      />
      <h2>Usuarios</h2>

      <div className="barra-acoes">
        <button type="button" className="botao-primario" onClick={abrirModal}>
          Novo usuário
        </button>
        <button type="button" onClick={carregar} disabled={carregando}>
          Atualizar
        </button>
      </div>

      {mensagem && <p className="sucesso">{mensagem}</p>}
      {carregando && <p>Carregando...</p>}
      {erro && <p className="erro">{erro}</p>}
      {!carregando && !erro && (
        <UsuariosTabela usuarios={usuarios} onAlternarAtivo={alternarAtivo} />
      )}

      {modalAberto && (
        <Modal
          titulo="Novo usuário"
          onFechar={() => setModalAberto(false)}
          bloqueado={enviando}
        >
          {erroCriar && <p className="erro">{erroCriar}</p>}
          <UsuarioForm
            onSubmit={handleCriar}
            enviando={enviando}
            aoCancelar={() => setModalAberto(false)}
          />
        </Modal>
      )}
    </section>
  )
}

export default ListarUsuariosPage
