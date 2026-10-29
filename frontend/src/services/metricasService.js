import { requisicao } from './api.js'

const API_URL = '/api/metricas'

export async function obterMetricasSupervisor({ de, ate, id_tecnico }) {
  const params = new URLSearchParams({ de, ate })
  if (id_tecnico) params.set('id_tecnico', id_tecnico)
  const query = params.toString()

  const [concluidas, tempoPorStatus, tempoTotal, prazos] = await Promise.all([
    requisicao(`${API_URL}/concluidas-por-dia?${query}`),
    requisicao(`${API_URL}/tempo-por-status?${query}`),
    requisicao(`${API_URL}/tempo-total?${query}`),
    requisicao(`${API_URL}/prazos?${query}`),
  ])

  return { concluidas, tempoPorStatus, tempoTotal, prazos }
}
