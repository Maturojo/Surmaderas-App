import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "No autorizado" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ message: "No autorizado" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Sin permisos" });
    next();
  };
}
