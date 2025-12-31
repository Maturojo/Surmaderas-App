import { Router } from "express";
import {
  listarNotasPedido,
  crearNotaPedido,
  obtenerNotaPedido,
  eliminarNotaPedido,
  guardarCajaNota,
} from "../controllers/notasPedido.controller.js";

const router = Router();

router.get("/", listarNotasPedido);
router.post("/", crearNotaPedido);

router.get("/:id", obtenerNotaPedido);
router.delete("/:id", eliminarNotaPedido);

router.patch("/:id/guardar-caja", guardarCajaNota);

export default router;
