import mongoose from "mongoose";

const CajaSchema = new mongoose.Schema(
  {
    guardada: { type: Boolean, default: false },
    tipo: { type: String, enum: ["seña", "pago"], default: "pago" },
    monto: { type: Number, default: 0 },
    fecha: { type: Date },
    metodo: { type: String, default: "" },
    nota: { type: String, default: "" },
  },
  { _id: false }
);

const NotaPedidoSchema = new mongoose.Schema(
  {
    numero: { type: String, default: "" },
    fecha: { type: String, default: "" },
    entrega: { type: String, default: "" },
    cliente: { type: String, default: "" },
    vendedor: { type: String, default: "" },
    items: { type: Array, default: [] },
    total: { type: Number, default: 0 },

    estado: { type: String, enum: ["pendiente", "señada", "pagada"], default: "pendiente" },
    caja: { type: CajaSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model("NotaPedido", NotaPedidoSchema);
