import { Router } from 'express'

import * as UsuariosController from '../controllers/usuarios.controller.js'
import { validaToken } from '../middlewares/auth.middleware.js'
import { validaCargo } from '../middlewares/validaCargo.middleware.js'

const router = Router()
router.use(validaToken, validaCargo('admin'))

// rotas de usuario (sem DELETE: usuario e desativado)
router.get('/', UsuariosController.buscarTodosUsuarios)
router.post('/', UsuariosController.criaUsuario)
router.put('/:id_usuario', UsuariosController.editaUsuario)
router.patch('/:id_usuario/ativo', UsuariosController.alteraAtivo)

export default router
