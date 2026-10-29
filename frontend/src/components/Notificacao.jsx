import { useEffect } from 'react'
import '../styles/Notificacao.css'

function Notificacao({ notificacao, aoFechar }) {
  useEffect(() => {
    if (!notificacao) return undefined

    const timer = setTimeout(aoFechar, 5000)
    return () => clearTimeout(timer)
  }, [notificacao, aoFechar])

  if (!notificacao) return null

  const sucesso = notificacao.tipo === 'sucesso'

  return (
    <div
      className={`notificacao notificacao-${notificacao.tipo}`}
      role={sucesso ? 'status' : 'alert'}
      aria-live={sucesso ? 'polite' : 'assertive'}
    >
      <span className="notificacao-icone" aria-hidden="true">
        {sucesso ? '✓' : '!'}
      </span>
      <p>{notificacao.mensagem}</p>
      <button type="button" onClick={aoFechar} aria-label="Fechar notificação">
        ×
      </button>
    </div>
  )
}

export default Notificacao
