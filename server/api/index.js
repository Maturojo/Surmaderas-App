import "dotenv/config";

import { createApp } from "../src/app.js";
import { ensureDbConnection } from "../src/dbConnect.js";

const { app } = createApp();

export default async function handler(req, res) {
  await ensureDbConnection();
  return app(req, res);
}
