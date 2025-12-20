import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // ej: "nota:2025-12-16"
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Counter", CounterSchema);
