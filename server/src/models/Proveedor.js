import mongoose from "mongoose";

const ProveedorSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, unique: true },
    telefono: { type: String, default: "", trim: true },
    contacto: { type: String, default: "", trim: true },
    nota: { type: String, default: "", trim: true },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Proveedor || mongoose.model("Proveedor", ProveedorSchema);
