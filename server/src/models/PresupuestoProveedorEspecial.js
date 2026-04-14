import mongoose from "mongoose";

const ImagenAdjuntaSchema = new mongoose.Schema(
  {
    dataUrl: { type: String, default: "" },
    name: { type: String, default: "", trim: true },
    type: { type: String, default: "", trim: true },
    size: { type: Number, default: 0, min: 0 },
    updatedAt: { type: String, default: "" },
  },
  { _id: false }
);

const PresupuestoProveedorEspecialSchema = new mongoose.Schema(
  {
    proveedorId: { type: mongoose.Schema.Types.ObjectId, ref: "Proveedor", required: true },
    proveedorNombre: { type: String, required: true, trim: true },
    proveedorColor: { type: String, default: "" },
    descripcionPedido: { type: String, required: true, trim: true },
    materiales: { type: String, default: "", trim: true },
    medidas: { type: String, default: "", trim: true },
    terminacion: { type: String, default: "", trim: true },
    monto: { type: Number, required: true, min: 0 },
    precioCliente: { type: Number, default: 0, min: 0 },
    fechaPresupuesto: { type: String, required: true, trim: true },
    foto: { type: ImagenAdjuntaSchema, default: null },
    observacion: { type: String, default: "", trim: true },
    creadoPor: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.PresupuestoProveedorEspecial ||
  mongoose.model("PresupuestoProveedorEspecial", PresupuestoProveedorEspecialSchema);
