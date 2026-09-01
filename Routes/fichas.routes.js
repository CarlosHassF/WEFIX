import { Router } from "express";

import * as FichasController from "../controllers/fichas.controller.js";


const router = Router();

//rotas fichas
router.get('/', FichasController.listarTodasFichas);
router.get('/status/:status', FichasController.listarFichasStatus);
router.post('/', FichasController.criaFicha);
router.patch('/', FichasController.alteraStatus);
router.delete('/:id_manutencao', FichasController.deletaFicha);
router.put('/:id_manutencao', FichasController.alteraFicha);


export default router;