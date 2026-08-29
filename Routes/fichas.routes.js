import { Router } from "express";

import * as FichasController from "../controllers/fichas.controller.js";


const router = Router();


router.get('/', FichasController.listarTodasFichas);
router.get('/status/:status', FichasController.listarFichasStatus);
router.post('/', FichasController.criaFicha);
router.put('/', FichasController.alteraStatus);

export default router;