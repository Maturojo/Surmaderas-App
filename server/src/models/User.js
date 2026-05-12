import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "ventas", "taller"], default: "ventas" },
    isActive: { type: Boolean, default: true },
    allowedModules: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
