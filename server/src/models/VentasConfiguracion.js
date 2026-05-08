import mongoose from "mongoose";

const VentasConfiguracionSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true, index: true },
    categories: {
      type: [String],
      default: ["PRODUCTOS A MEDIDA", "CORTES A MEDIDA", "PORTARRETRATOS", "MUEBLES ESTANDAR", "MOLDURAS", "OTROS"],
    },
    subcategories: {
      type: [String],
      default: ["CORTES RECTOS", "CORTES LASER", "CORTE ESPECIAL", "MARCOS", "MELAMINA"],
    },
    clients: {
      type: [String],
      default: ["CLIENTE FINAL"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("VentasConfiguracion", VentasConfiguracionSchema);
