import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ["corte", "marco", "calado", "mueble", "producto", "prestamo"],
      default: "producto",
      index: true,
    },

    productoId: { type: mongoose.Schema.Types.ObjectId, ref: "Producto", default: null },

    descripcion: { type: String, required: true },

    cantidad: { type: Number, required: true, min: 0 },
    precioUnit: { type: Number, required: true, min: 0 },

    especial: { type: Boolean, default: false },

    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const NotaPedidoSchema = new mongoose.Schema(
  {
    numero: { type: String, required: true, unique: true },

    fecha: { type: String, required: true }, // "YYYY-MM-DD"
    entrega: { type: String, required: true }, // "YYYY-MM-DD"
    diasHabiles: { type: Number, default: 0 },

    cliente: {
      nombre: { type: String, required: true },
      telefono: { type: String, default: "" },
      direccion: { type: String, default: "" },
    },

    vendedor: { type: String, default: "" },

    // Lo mantenemos por compatibilidad visual, pero CAJA ahora es la fuente de verdad:
    medioPago: { type: String, default: "" },

    items: { type: [ItemSchema], default: [] },

    // Mantengo tu estructura original por compatibilidad con notas existentes y PDF actual
    totales: {
      subtotal: { type: Number, default: 0 },
      descuento: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      adelanto: { type: Number, default: 0 },
      resta: { type: Number, default: 0 },
    },

    // NUEVO: datos de caja (editables solo por endpoint protegido)
    caja: {
      ajuste: {
        modo: {
          type: String,
          enum: ["sin", "descuento_monto", "descuento_pct", "precio_especial"],
          default: "sin",
        },
        descuentoMonto: { type: Number, default: 0, min: 0 },
        descuentoPct: { type: Number, default: 0, min: 0, max: 100 },
        precioEspecial: { type: Number, default: 0, min: 0 },
        motivo: { type: String, default: "" },
      },
      pago: {
        tipo: {
          type: String,
          enum: ["", "efectivo", "debito", "credito", "transferencia", "qr", "mixto", "otro"],
          default: "",
        },
        adelanto: { type: Number, default: 0, min: 0 },
        estado: {
          type: String,
          enum: ["pendiente", "parcial", "pagado"],
          default: "pendiente",
        },
        updatedAt: { type: Date, default: null },
      },
      totales: {
        descuentoAplicado: { type: Number, default: 0, min: 0 },
        totalFinal: { type: Number, default: 0, min: 0 },
        resta: { type: Number, default: 0 },
      },
    },

    pdfBase64: { type: String, default: "" },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    estado: {
      type: String,
      enum: ["pendiente", "entregado", "cancelado"],
      default: "pendiente",
    },
  },
  { timestamps: true }
);

export default mongoose.model("NotaPedido", NotaPedidoSchema);
