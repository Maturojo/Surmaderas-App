import mongoose from "mongoose";

const VENDEDORES = ["Ariel", "Cecilia", "Gustavo", "Juana", "Matias", "Patricia", "Valentina", "WhatsApp"];

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
    tipo: { type: String, enum: ["", "seña", "pago"], default: "" },
    monto: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    descuento: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    adelanto: { type: Number, default: 0 },
    resta: { type: Number, default: 0 },
    fecha: { type: Date },
    metodo: { type: String, default: "" },
    nota: { type: String, default: "" },
    comprobante: {
      nombre: { type: String, default: "" },
      tipo: { type: String, default: "" },
      dataUrl: { type: String, default: "" },
      monto: { type: Number, default: 0 },
    },
    comprobantes: {
      type: [
        {
          nombre: { type: String, default: "" },
          tipo: { type: String, default: "" },
          dataUrl: { type: String, default: "" },
          monto: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

const ProveedorAsignadoSchema = new mongoose.Schema(
  {
    proveedorId: { type: mongoose.Schema.Types.ObjectId, ref: "Proveedor", required: true },
    nombre: { type: String, default: "" },
    color: { type: String, default: "" },
    observacion: { type: String, default: "" },
    enviadoWhatsapp: { type: Boolean, default: false },
    asignadoAt: { type: Date, default: Date.now },
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
    vendedor: { type: String, enum: ["", ...VENDEDORES], default: "" },
    medioPago: { type: String, default: "" },
    items: { type: Array, default: [] },
    total: { type: Number, default: 0 },
    totales: { type: TotalesSchema, default: () => ({}) },
    pdfBase64: { type: String, default: "" },
    estado: { type: String, enum: ["pendiente", "señada", "pagada"], default: "pendiente" },
    caja: { type: CajaSchema, default: () => ({}) },
    estadoOperativo: {
      type: String,
      enum: ["Pendiente", "En taller", "Enviado a proveedor", "Finalizado"],
      default: "Pendiente",
    },
    proveedores: { type: [ProveedorAsignadoSchema], default: [] },
  },
  { timestamps: true }
);

NotaPedidoSchema.index({ "caja.guardada": 1, createdAt: -1 });
NotaPedidoSchema.index({ "caja.guardada": 1, estadoOperativo: 1, createdAt: -1 });

export default mongoose.model("NotaPedido", NotaPedidoSchema);
