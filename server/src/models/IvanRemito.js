import mongoose from "mongoose";

const IvanRemitoItemSchema = new mongoose.Schema(
  {
    productoId: { type: mongoose.Schema.Types.ObjectId, ref: "IvanProduct", default: null },
    codigo: { type: String, trim: true, default: "" },
    nombre: { type: String, required: true, trim: true },
    cantidad: { type: Number, default: 1, min: 0 },
    unidad: { type: String, trim: true, default: "u" },
    detalle: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const IvanRemitoSchema = new mongoose.Schema(
  {
    numero: { type: Number, required: true, unique: true, index: true },
    fecha: { type: String, required: true },
    destinatario: { type: String, required: true, trim: true },
    direccion: { type: String, trim: true, default: "" },
    transporte: { type: String, trim: true, default: "" },
    observaciones: { type: String, trim: true, default: "" },
    items: { type: [IvanRemitoItemSchema], default: [] },
    creadoPor: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("IvanRemito", IvanRemitoSchema);
