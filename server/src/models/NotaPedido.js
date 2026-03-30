import mongoose from "mongoose";

const ClienteSchema = new mongoose.Schema(
  {
    nombre: { type: String, default: "" },
    telefono: { type: String, default: "" },
    direccion: { type: String, default: "" },
  },
  { _id: false }
);

const TotalesSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, default: 0 },
    descuento: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    adelanto: { type: Number, default: 0 },
    resta: { type: Number, default: 0 },
  },
  { _id: false }
);

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
    diasHabiles: { type: Number, default: 0 },
    cliente: { type: ClienteSchema, default: () => ({}) },
    vendedor: { type: String, default: "" },
    medioPago: { type: String, default: "" },
    items: { type: Array, default: [] },
    total: { type: Number, default: 0 },
    totales: { type: TotalesSchema, default: () => ({}) },
    pdfBase64: { type: String, default: "" },
    estado: { type: String, enum: ["pendiente", "señada", "pagada"], default: "pendiente" },
    caja: { type: CajaSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model("NotaPedido", NotaPedidoSchema);
