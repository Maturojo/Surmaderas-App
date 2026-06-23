import mongoose from "mongoose";

const IvanMaterialSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ["material", "liston"], default: "material" },
    nombre: { type: String, trim: true, default: "" },
    cantidad: { type: Number, default: 0, min: 0 },
    unidad: { type: String, trim: true, default: "u" },
    costoUnitario: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const IvanProductSchema = new mongoose.Schema(
  {
    codigo: { type: String, trim: true, default: "", index: true },
    nombre: { type: String, required: true, trim: true, index: true },
    descripcion: { type: String, trim: true, default: "" },
    imagen: { type: String, default: "" },
    materiales: { type: [IvanMaterialSchema], default: [] },
    costo: { type: Number, default: 0, min: 0 },
    valor: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    unidad: { type: String, trim: true, default: "u" },
    observaciones: { type: String, trim: true, default: "" },
    activo: { type: Boolean, default: true },
    creadoPor: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

IvanProductSchema.index({ nombre: "text", codigo: "text" });

export default mongoose.model("IvanProduct", IvanProductSchema);
