import express from "express";
import cors from "cors";

import productosRoutes from "./routes/productos.routes.js";
import authRouter from "./routes/auth.routes.js";
import notasPedidoRoutes from "./routes/notasPedido.routes.js";
import proveedoresRoutes from "./routes/proveedores.routes.js";
import pedidosProveedorRoutes from "./routes/pedidosProveedor.routes.js";
import turneroRoutes from "./routes/turnero.routes.js";
import usersRoutes from "./routes/users.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import calendarRoutes from "./routes/calendar.routes.js";

function getAllowedOrigins() {
  const extraOrigins = String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return [
    process.env.CORS_ORIGIN,
    ...extraOrigins,
    "http://localhost:5173",
    "http://localhost:5174",
  ].filter(Boolean);
}

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS bloqueado para origin: ${origin}`), false);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  app.use("/auth", authRouter);
  app.use("/api/productos", productosRoutes);
  app.use("/api/notas-pedido", notasPedidoRoutes);
  app.use("/api/proveedores", proveedoresRoutes);
  app.use("/api/pedidos-proveedor", pedidosProveedorRoutes);
  app.use("/api/turnero", turneroRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/calendar", calendarRoutes);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  return { app, allowedOrigins };
}
