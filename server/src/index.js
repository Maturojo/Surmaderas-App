import "dotenv/config";

import { createApp } from "./app.js";
import { ensureDbConnection } from "./dbConnect.js";

const PORT = process.env.PORT || 4000;
const { app, allowedOrigins } = createApp();

async function start() {
  try {
    const connection = await ensureDbConnection();

    console.log("MongoDB conectado OK:", connection.name);

    app.listen(PORT, () => {
      console.log(`API corriendo en http://localhost:${PORT}`);
      console.log("CORS allowlist:", allowedOrigins);
    });
  } catch (err) {
    console.error("Error conectando a MongoDB:", err.message);
    if (err?.message?.includes("ENOTFOUND")) {
      console.error("Revisa el hostname del cluster en MONGODB_URI.");
    }
    if (err?.message?.includes("bad auth") || err?.message?.includes("Authentication failed")) {
      console.error("Revisa usuario y password del usuario de MongoDB Atlas.");
    }
    if (err?.message?.includes("IP") || err?.message?.includes("whitelist")) {
      console.error("Revisa Network Access en MongoDB Atlas.");
    }
    process.exit(1);
  }
}

start();
