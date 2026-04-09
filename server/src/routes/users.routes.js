import { Router } from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", async (_req, res) => {
  try {
    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    console.error("Error listando usuarios:", error?.message || error);
    return res.status(500).json({ message: "No se pudo obtener la lista de usuarios" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, username, password, role, isActive } = req.body || {};

    if (!name || !username || !password) {
      return res.status(400).json({ message: "Nombre, usuario y clave son obligatorios" });
    }

    if (!["admin", "ventas", "taller"].includes(role)) {
      return res.status(400).json({ message: "Rol invalido" });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const existing = await User.findOne({ username: normalizedUsername });

    if (existing) {
      return res.status(400).json({ message: "Ese nombre de usuario ya existe" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      name: String(name).trim(),
      username: normalizedUsername,
      passwordHash,
      role,
      isActive: isActive !== false,
    });

    return res.status(201).json({
      message: "Usuario creado correctamente",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creando usuario:", error?.message || error);
    return res.status(500).json({ message: "No se pudo crear el usuario" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, password, role, isActive } = req.body || {};

    if (!name || !username) {
      return res.status(400).json({ message: "Nombre y usuario son obligatorios" });
    }

    if (!["admin", "ventas", "taller"].includes(role)) {
      return res.status(400).json({ message: "Rol invalido" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const existing = await User.findOne({ username: normalizedUsername, _id: { $ne: id } });

    if (existing) {
      return res.status(400).json({ message: "Ese nombre de usuario ya existe" });
    }

    user.name = String(name).trim();
    user.username = normalizedUsername;
    user.role = role;
    user.isActive = isActive !== false;

    if (password) {
      user.passwordHash = await bcrypt.hash(String(password), 10);
    }

    await user.save();

    return res.json({
      message: "Usuario actualizado correctamente",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error actualizando usuario:", error?.message || error);
    return res.status(500).json({ message: "No se pudo actualizar el usuario" });
  }
});

export default router;
