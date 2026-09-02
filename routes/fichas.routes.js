import { Router } from 'express'

import * as FichasController from '../controllers/fichas.controller.js'
import { validaToken } from '../middlewares/auth.middleware.js'
import { validaCargo } from '../middlewares/validaCargo.middleware.js'

const router = Router()

router.use(validaToken)

//rotas fichas
router.get('/',validaCargo('admin', 'tecnico'),FichasController.listarTodasFichas)
router.get('/status/:status',validaCargo('admin', 'tecnico'), FichasController.listarFichasStatus)
router.post('/',validaCargo('atendente', 'admin'), FichasController.criaFicha)
router.patch('/', FichasController.alteraStatus)
router.delete('/:id_manutencao',validaCargo('admin'), FichasController.deletaFicha)
router.put('/:id_manutencao',validaCargo('admin', 'tecnico'), FichasController.alteraFicha)

export default router
