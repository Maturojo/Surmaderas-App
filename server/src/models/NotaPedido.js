import mongoose from "mongoose";

const { Schema } = mongoose;

// Subschemas (ajustá si ya los tenés)
const ClienteSchema = new Schema(
  {
    nombre: { type: String, default: "" },
    telefono: { type: String, default: "" },
  },
  { _id: false }
);

const ItemSchema = new Schema(
  {
    descripcion: { type: String, required: true },
    tipo: { type: String, default: "" },
    cantidad: { type: Number, default: 1 },
    precioUnit: { type: Number, default: 0 },
    data: { type: Schema.Types.Mixed, default: {} }, // imágenes, etc.
  },
  { _id: false }
);

const TotalesSchema = new Schema(
  {
    subtotal: { type: Number, default: 0 },
    descuento: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    adelanto: { type: Number, default: 0 },
    resta: { type: Number, default: 0 },
  },
  { _id: false }
);

// IMPORTANTE: enum en minúsculas (evita el error de "Transferencia")
const CajaSchema = new Schema(
  {
    ajuste: {
      modo: { type: String, default: "sin" }, // sin | descuento_monto | descuento_pct | precio_especial
      descuentoMonto: { type: Number, default: 0 },
      descuentoPct: { type: Number, default: 0 },
      precioEspecial: { type: Number, default: 0 },
      motivo: { type: String, default: "" },
    },
    pago: {
      tipo: {
        type: String,
        enum: ["", "efectivo", "debito", "credito", "transferencia", "qr", "mixto", "otro"],
        default: "",
      },
      adelanto: { type: Number, default: 0 },
      estado: { type: String, enum: ["pendiente", "parcial", "pagado"], default: "pendiente" },
      updatedAt: { type: Date, default: null },
    },
    totales: {
      descuentoAplicado: { type: Number, default: 0 },
      totalFinal: { type: Number, default: 0 },
      resta: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const NotaPedidoSchema = new Schema(
  {
    numero: { type: String, required: true, index: true },
    fecha: { type: String, default: "" }, // yyyy-mm-dd
    entrega: { type: String, default: "" }, // yyyy-mm-dd
    diasHabiles: { type: Number, default: 0 },

    estado: { type: String, default: "pendiente" },

    cliente: { type: ClienteSchema, default: () => ({}) },
    vendedor: { type: String, default: "" },

    items: { type: [ItemSchema], default: [] },

    medioPago: { type: String, default: "" }, // compat viejo
    totales: { type: TotalesSchema, default: () => ({}) },

    caja: { type: CajaSchema, default: () => ({}) },

    pdfBase64: { type: String, default: "" },

    // ✅ SOFT DELETE
    eliminada: { type: Boolean, default: false, index: true },
    eliminadaAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("NotaPedido", NotaPedidoSchema);
