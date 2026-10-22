import { Router } from 'express'

import * as MetricasController from '../controllers/metricas.controller.js'
import { validaToken } from '../middlewares/auth.middleware.js'
import { validaCargo } from '../middlewares/validaCargo.middleware.js'

const router = Router()
router.use(validaToken, validaCargo('admin'))

// metricas do supervisor (?de=&ate=&id_tecnico=)
router.get('/concluidas-por-dia', MetricasController.concluidasPorDia)
router.get('/tempo-por-status', MetricasController.tempoPorStatus)
router.get('/tempo-total', MetricasController.tempoTotal)
router.get('/prazos', MetricasController.prazos)

export default router
