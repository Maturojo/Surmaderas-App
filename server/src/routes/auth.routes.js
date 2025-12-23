import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();

/**
 * LOGIN
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: "Faltan credenciales" });
    }

    const user = await User.findOne({
      username: String(username).toLowerCase().trim(),
      isActive: true,
    });

    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Error en login" });
  }
});

router.post("/reset-admin-password", async (req, res) => {
  try {
    const passwordHash = await bcrypt.hash("admin", 10);

    const result = await User.updateOne(
      { username: "admin" },
      { $set: { passwordHash, isActive: true } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "No existe el usuario admin" });
    }

    return res.json({ message: "Password de admin reseteada a 'admin' (y activado)" });
  } catch (err) {
    return res.status(500).json({ message: "Error reseteando password" });
  }
});


/**
 * CREAR USUARIO ADMIN (SOLO DESARROLLO)
 * user: admin
 * pass: admin
 */
router.post("/seed-admin", async (req, res) => {
  try {
    const exists = await User.findOne({ username: "admin" });
    if (exists) {
      return res.status(400).json({ message: "El usuario admin ya existe" });
    }

    const passwordHash = await bcrypt.hash("admin", 10);

    const user = await User.create({
      name: "Administrador",
      username: "admin",
      passwordHash,
      role: "admin",
      isActive: true,
    });

    return res.json({
      message: "Usuario admin creado",
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Error creando admin" });
  }
});

export default router;
