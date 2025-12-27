import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    // Nuevo: tipo de ítem (corte/marco/calado/mueble/producto/prestamo)
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

    // Nuevo: datos específicos por tipo, incluyendo imagen (base64)
    // Ej:
    // data: {
    //   material, largoMm, ...
    //   imagen: { dataUrl, name, type, size, updatedAt }
    // }
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
    medioPago: { type: String, default: "" },

    items: { type: [ItemSchema], default: [] },

    totales: {
      subtotal: { type: Number, default: 0 },
      descuento: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      adelanto: { type: Number, default: 0 },
      resta: { type: Number, default: 0 },
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
