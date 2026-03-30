import { Router } from "express";
import {
  listarNotasPedido,
  crearNotaPedido,
  obtenerNotaPedido,
  eliminarNotaPedido,
  guardarCajaNota,
} from "../controllers/notasPedido.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, listarNotasPedido);
router.post("/", requireAuth, crearNotaPedido);

router.get("/:id", requireAuth, obtenerNotaPedido);
router.delete("/:id", requireAuth, eliminarNotaPedido);

router.patch("/:id/guardar-caja", requireAuth, guardarCajaNota);

export default router;
