import "dotenv/config";
import bcrypt from "bcrypt";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";

await connectDB(process.env.MONGODB_URI);

const username = "admin";
const password = "admin123"; // cambiá después
const name = "Admin Sur Maderas";

const exists = await User.findOne({ username });
if (exists) {
  console.log("Admin ya existe");
  process.exit(0);
}

const passwordHash = await bcrypt.hash(password, 10);
await User.create({ name, username, passwordHash, role: "admin" });

console.log("Admin creado:", { username, password });
process.exit(0);
