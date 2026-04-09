import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  actualizarRecordatorio,
  crearRecordatorio,
  eliminarRecordatorio,
  listarCalendario,
} from "../controllers/calendar.controller.js";

const router = Router();

router.get("/", requireAuth, listarCalendario);
router.post("/recordatorios", requireAuth, crearRecordatorio);
router.patch("/recordatorios/:id", requireAuth, actualizarRecordatorio);
router.delete("/recordatorios/:id", requireAuth, eliminarRecordatorio);

export default router;
