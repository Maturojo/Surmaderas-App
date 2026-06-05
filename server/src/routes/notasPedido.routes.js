import { Router } from "express";
import {
  listarNotasPedido,
  crearNotaPedido,
  actualizarNotaPedido,
  obtenerNotaPedido,
  eliminarNotaPedido,
  eliminarNotasPedido,
  guardarCajaNota,
  actualizarOperacionNota,
} from "../controllers/notasPedido.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, listarNotasPedido);
router.post("/", requireAuth, crearNotaPedido);
router.delete("/bulk", requireAuth, eliminarNotasPedido);

router.get("/:id", requireAuth, obtenerNotaPedido);
router.patch("/:id", requireAuth, actualizarNotaPedido);
router.delete("/:id", requireAuth, eliminarNotaPedido);

router.patch("/:id/guardar-caja", requireAuth, guardarCajaNota);
router.patch("/:id/operacion", requireAuth, actualizarOperacionNota);

export default router;
