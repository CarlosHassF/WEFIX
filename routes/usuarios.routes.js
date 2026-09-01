import { Router } from 'express'

import * as UsuariosController from '../controllers/usuarios.controller.js'

const router = Router()

// GET
router.get('/', UsuariosController.buscarTodosUsuarios)

// POST
router.post('/', UsuariosController.criaUsuario)

// PUT
router.put('/:id_usuario', UsuariosController.editaUsuario)

// DELETE
router.delete('/:id_usuario', UsuariosController.deletaUsuario)

export default router
