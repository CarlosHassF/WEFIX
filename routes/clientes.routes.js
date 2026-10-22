import { Router } from 'express'

import * as ClientesController from '../controllers/clientes.controller.js'
import * as DispositivosController from '../controllers/dispositivos.controller.js'
import { validaToken } from '../middlewares/auth.middleware.js'
import { validaCargo } from '../middlewares/validaCargo.middleware.js'

const router = Router()
const leitura = validaCargo('atendente', 'admin', 'tecnico')
const escrita = validaCargo('atendente', 'admin')

router.use(validaToken)

// rotas de clientes
router.get('/', leitura, ClientesController.listaClientes)
router.get('/:id_cliente', leitura, ClientesController.buscaCliente)
router.post('/', escrita, ClientesController.criaCliente)
router.put('/:id_cliente', escrita, ClientesController.editaCliente)

// dispositivos de um cliente
router.get(
  '/:id_cliente/dispositivos',
  leitura,
  DispositivosController.listaDispositivos
)
router.post(
  '/:id_cliente/dispositivos',
  escrita,
  DispositivosController.criaDispositivo
)

export default router
