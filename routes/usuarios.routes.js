import { Router } from 'express'

import * as UsuariosController from '../controllers/usuarios.controller.js'
import { validaToken } from '../middlewares/auth.middleware.js'
import { validaCargo } from '../middlewares/validaCargo.middleware.js'

const router = Router()
router.post('/', UsuariosController.criaUsuario)
router.use(validaToken, validaCargo('admin'))

// rotas de usuario
router.get('/', UsuariosController.buscarTodosUsuarios)
router.put('/:id_usuario', UsuariosController.editaUsuario)
router.delete('/:id_usuario', UsuariosController.deletaUsuario)

export default router
