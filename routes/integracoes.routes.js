import { Router } from 'express'

import * as IntegracoesController from '../controllers/integracoes.controller.js'
import { validaApiKeyN8n } from '../middlewares/validaApiKeyN8n.middleware.js'

const router = Router()

// rotas chamadas pelo n8n (sem JWT, com x-api-key)
router.use(validaApiKeyN8n)
router.post(
  '/fichas/:id_manutencao/orcamento',
  IntegracoesController.respostaOrcamento
)

export default router
