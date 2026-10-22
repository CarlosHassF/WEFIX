import { Router } from 'express'

import * as DispositivosController from '../controllers/dispositivos.controller.js'
import { validaToken } from '../middlewares/auth.middleware.js'
import { validaCargo } from '../middlewares/validaCargo.middleware.js'

const router = Router()

router.use(validaToken)

// edicao de dispositivo (criacao e listagem ficam em /clientes/:id_cliente/dispositivos)
router.put(
  '/:id_dispositivo',
  validaCargo('atendente', 'admin'),
  DispositivosController.editaDispositivo
)

export default router
