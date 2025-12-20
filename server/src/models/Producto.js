import mongoose from "mongoose";

const ProductoSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true, index: true }, // AC1, BA1, etc.
    nombre: { type: String, required: true, index: true },
    precio: { type: Number, required: true, min: 0 },
    unidad: { type: String, default: "u" },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Producto", ProductoSchema);
