import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Turnero from "../models/Turnero.js";

const router = Router();
const TURNERO_KEY = "dashboard-principal";

async function ensureTurnero() {
  const existing = await Turnero.findOne({ key: TURNERO_KEY });
  if (existing) {
    return existing;
  }

  try {
    return await Turnero.create({
      key: TURNERO_KEY,
      currentNumber: 1,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return Turnero.findOne({ key: TURNERO_KEY });
    }
    throw error;
  }
}

router.get("/", requireAuth, async (_req, res) => {
  try {
    const turnero = await ensureTurnero();
    return res.json(turnero);
  } catch (error) {
    console.error("Error obteniendo turnero:", error?.message || error);
    return res.status(500).json({ message: "No se pudo obtener el turnero" });
  }
});

router.post("/take", requireAuth, async (req, res) => {
  try {
    await ensureTurnero();
    const takenBy = req.user?.name || "Usuario";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const current = await Turnero.findOne({ key: TURNERO_KEY });

      if (!current) {
        continue;
      }

      const updated = await Turnero.findOneAndUpdate(
        { _id: current._id, currentNumber: current.currentNumber },
        {
          $set: {
            lastTakenNumber: current.currentNumber,
            lastTakenBy: takenBy,
            takenAt: new Date(),
          },
          $inc: { currentNumber: 1 },
        },
        { new: true }
      );

      if (updated) {
        return res.json(updated);
      }
    }

    return res.status(409).json({ message: "No se pudo tomar el turno. Intenta nuevamente." });
  } catch (error) {
    console.error("Error tomando turno:", error?.message || error);
    return res.status(500).json({ message: "No se pudo tomar el turno" });
  }
});

router.patch("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const nextNumber = Number(req.body?.currentNumber);

    if (!Number.isInteger(nextNumber) || nextNumber <= 0) {
      return res.status(400).json({ message: "El numero del turnero debe ser un entero mayor a 0" });
    }

    const turnero = await ensureTurnero();
    const updated = await Turnero.findByIdAndUpdate(
      turnero._id,
      {
        $set: {
          currentNumber: nextNumber,
          lastTakenNumber: null,
          lastTakenBy: "",
          takenAt: null,
        },
      },
      { new: true }
    );

    return res.json(updated);
  } catch (error) {
    console.error("Error actualizando turnero:", error?.message || error);
    return res.status(500).json({ message: "No se pudo actualizar el turnero" });
  }
});

export default router;
