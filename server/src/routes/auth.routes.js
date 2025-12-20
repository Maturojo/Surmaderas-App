import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: "Faltan credenciales" });

  const user = await User.findOne({ username: String(username).toLowerCase().trim(), isActive: true });
  if (!user) return res.status(401).json({ message: "Credenciales inválidas" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Credenciales inválidas" });

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  res.json({
    token,
    user: { id: user._id, name: user.name, username: user.username, role: user.role },
  });
});

export default router;
