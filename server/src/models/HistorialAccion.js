import mongoose from "mongoose";

const HistorialAccionSchema = new mongoose.Schema(
  {
    tipo: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    cantidad: { type: Number, default: 0 },
    categoria: { type: String, default: "", trim: true },
    subcategoria: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.HistorialAccion || mongoose.model("HistorialAccion", HistorialAccionSchema);
