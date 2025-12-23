import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import productosRoutes from "./routes/productos.routes.js";
import authRouter from "./routes/auth.routes.js";


const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

app.use("/auth", authRouter);


app.use("/api/productos", productosRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Falta MONGODB_URI en el .env del server");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB conectado OK:", mongoose.connection.name);

    app.listen(PORT, () => {
      console.log(`API corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Error conectando a MongoDB:", err.message);
    process.exit(1);
  }
}

start();
