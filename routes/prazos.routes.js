import { Router } from 'express'

import * as PrazosController from '../controllers/prazos.controller.js'
import { validaToken } from '../middlewares/auth.middleware.js'
import { validaCargo } from '../middlewares/validaCargo.middleware.js'

const router = Router()
router.use(validaToken, validaCargo('admin'))

// prazos (SLA) por status
router.get('/', PrazosController.listaPrazos)
router.put('/:status', PrazosController.alteraPrazo)

export default router
