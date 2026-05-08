import mongoose from "mongoose";

const VentasObjetivoSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true, index: true },
    salesGoal: { type: Number, default: 0, min: 0 },
    commissionGoal: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("VentasObjetivo", VentasObjetivoSchema);
