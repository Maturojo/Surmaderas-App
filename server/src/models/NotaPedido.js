import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    productoId: { type: mongoose.Schema.Types.ObjectId, ref: "Producto", default: null },
    descripcion: { type: String, required: true },
    cantidad: { type: Number, required: true, min: 0 },
    precioUnit: { type: Number, required: true, min: 0 },
    especial: { type: Boolean, default: false },
  },
  { _id: false }
);

const NotaPedidoSchema = new mongoose.Schema(
  {
    numero: { type: String, required: true, unique: true },

    fecha: { type: String, required: true },   // "YYYY-MM-DD"
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

    // Para tu sistema (si tenés login)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    
    estado: { type: String, enum: ["pendiente", "entregado", "cancelado"], default: "pendiente" },
  },
  { timestamps: true }
);

export default mongoose.model("NotaPedido", NotaPedidoSchema);
