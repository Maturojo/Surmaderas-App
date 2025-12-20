import { Router } from "express";
import Producto from "../models/Producto.js";

const router = Router();

router.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "25", 10)));
  const skip = (page - 1) * limit;

  const filter = q
    ? {
        $or: [
          { nombre: { $regex: q, $options: "i" } },
          { codigo: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    Producto.find(filter).sort({ nombre: 1, _id: 1 }).skip(skip).limit(limit),
    Producto.countDocuments(filter),
  ]);

  res.json({ items, total, page, limit });
});

export default router;
