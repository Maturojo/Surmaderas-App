import mongoose from "mongoose";

const PedidoItemSchema = new mongoose.Schema(
  {
    descripcion: { type: String, required: true, trim: true },
    cantidad: { type: Number, default: 1, min: 0 },
    unidad: { type: String, default: "u", trim: true },
    precioEstimado: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const PedidoProveedorSchema = new mongoose.Schema(
  {
    proveedorId: { type: mongoose.Schema.Types.ObjectId, ref: "Proveedor", required: true },
    proveedorNombre: { type: String, required: true, trim: true },
    proveedorColor: { type: String, default: "" },
    tipo: { type: String, enum: ["Material", "Producto"], required: true },
    fechaPedido: { type: String, default: "" },
    estado: { type: String, enum: ["Pendiente", "Pedido", "Recibido", "Cancelado"], default: "Pendiente" },
    items: { type: [PedidoItemSchema], default: [] },
    observacion: { type: String, default: "", trim: true },
    creadoPor: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.PedidoProveedor || mongoose.model("PedidoProveedor", PedidoProveedorSchema);
