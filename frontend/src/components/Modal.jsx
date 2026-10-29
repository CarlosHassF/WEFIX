import { useEffect, useId, useRef } from 'react'
import '../Modal.css'

// casca reutilizável: fundo escuro + caixa + cabeçalho com botão de fechar.
// o conteúdo (formulário, texto, botões) entra como children.
// "bloqueado" impede de fechar enquanto uma requisição está no ar.
function Modal({
  titulo,
  onFechar,
  bloqueado = false,
  largo = false,
  children,
}) {
  const idTitulo = useId()
  const caixa = useRef(null)

  // ao abrir: trava a rolagem do fundo e põe o foco no primeiro campo.
  // ao fechar: destrava e devolve o foco para o botão que abriu o modal.
  useEffect(() => {
    const anterior = document.activeElement
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    caixa.current
      ?.querySelector('input, select, textarea, button:not(.modal-fechar)')
      ?.focus()

    return () => {
      document.body.style.overflow = overflowAnterior
      anterior?.focus?.()
    }
  }, [])

  // fecha com Esc (separado do efeito acima para não roubar o foco a cada mudança)
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === 'Escape' && !bloqueado) onFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [bloqueado, onFechar])

  return (
    // só fecha se o clique for no fundo, e não dentro da caixa
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !bloqueado) onFechar()
      }}
    >
      <div
        ref={caixa}
        className={`modal${largo ? ' modal-largo' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
      >
        <div className="modal-cabecalho">
          <h3 id={idTitulo}>{titulo}</h3>
          <button
            type="button"
            className="modal-fechar"
            onClick={onFechar}
            disabled={bloqueado}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

export default Modal
