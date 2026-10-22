import { Router } from 'express'

import * as FichasController from '../controllers/fichas.controller.js'
import { validaToken } from '../middlewares/auth.middleware.js'
import { validaCargo } from '../middlewares/validaCargo.middleware.js'

const router = Router()
const todos = validaCargo('atendente', 'admin', 'tecnico')

router.use(validaToken)

//rotas fichas (sem DELETE: ficha so e cancelada)
router.get('/', todos, FichasController.listaFichas)
router.get('/:id_manutencao', todos, FichasController.buscaFicha)
router.post('/', validaCargo('atendente', 'admin'), FichasController.criaFicha)
router.put('/:id_manutencao', todos, FichasController.alteraFicha)
router.patch('/:id_manutencao/status', todos, FichasController.alteraStatus)

export default router
