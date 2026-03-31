import mongoose from "mongoose";

const SubcategoriaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    categoria: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

SubcategoriaSchema.index({ nombre: 1, categoria: 1 }, { unique: true });

export default mongoose.models.Subcategoria || mongoose.model("Subcategoria", SubcategoriaSchema);
