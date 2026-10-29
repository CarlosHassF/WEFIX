import { useState } from 'react'
import { STATUS_LABELS } from '../utils/statusFicha.js'

function StatusFichaModal({ ficha, transicao, enviando, onConfirm, onClose }) {
  const [diagnostico, setDiagnostico] = useState(ficha.diagnostico || '')
  const [valorServico, setValorServico] = useState(
    ficha.valor_servico != null ? String(ficha.valor_servico).replace('.', ',') : ''
  )
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')
  const exige = transicao.exige || []

  async function confirmar() {
    const extras = {}
    if (exige.includes('diagnostico')) {
      if (!diagnostico.trim()) {
        setErro('Informe o diagnóstico.')
        return
      }
      extras.diagnostico = diagnostico.trim()
    }
    if (exige.includes('valor_servico')) {
      const valor = Number(valorServico.replace(',', '.'))
      if (!valorServico.trim() || !Number.isFinite(valor) || valor < 0) {
        setErro('Informe um valor de serviço válido.')
        return
      }
      extras.valor_servico = valor
    }
    if (exige.includes('observacao')) {
      if (!observacao.trim()) {
        setErro('Informe uma observação para esta transição.')
        return
      }
      extras.observacao = observacao.trim()
    }
    setErro('')
    await onConfirm(extras)
  }

  return (
    <div className="modal-overlay" onClick={() => !enviando && onClose()}>
      <div className="modal-exclusao" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>
          Mover ordem #{String(ficha.id_manutencao)} para {STATUS_LABELS[transicao.para]}
        </h3>
        {exige.includes('diagnostico') && (
          <label className="form-campo">
            Diagnóstico *
            <textarea value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} maxLength={1000} rows={4} />
          </label>
        )}
        {exige.includes('valor_servico') && (
          <label className="form-campo">
            Valor do serviço (R$) *
            <input
              value={valorServico}
              onChange={(e) => setValorServico(e.target.value)}
              inputMode="decimal"
              placeholder="Ex.: 150,00"
            />
          </label>
        )}
        {exige.includes('observacao') && (
          <label className="form-campo">
            Observação *
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={400} rows={3} />
          </label>
        )}
        {transicao.para === 'cancelado' && exige.length === 0 && (
          <p>A ordem será cancelada e não poderá mais ser editada.</p>
        )}
        {erro && <p className="mensagem-erro">{erro}</p>}
        <div className="modal-acoes">
          <button type="button" onClick={onClose} disabled={enviando}>
            Cancelar
          </button>
          <button type="button" onClick={confirmar} disabled={enviando}>
            {enviando ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default StatusFichaModal
