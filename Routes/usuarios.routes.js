import { Router } from "express";

import * as UsuariosController from "../controllers/usuarios.controller.js";


const router = Router();

router.get("/", UsuariosController.buscarTodosUsuarios);
router.post("/", UsuariosController.criaUsuario);
router.put("/:id_usuario", UsuariosController.editaUsuario);
router.delete("/:id_usuario", UsuariosController.deletaUsuario);
export default router;