import mongoose from "mongoose";

const VentaMensualSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },
    month: { type: String, required: true, index: true },
    client: { type: String, required: true, trim: true },
    contact: { type: String, default: "", trim: true },
    category: { type: String, required: true, trim: true },
    subcategory: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    total: { type: Number, required: true, min: 0 },
    commission: { type: Number, required: true, min: 0 },
    saleType: {
      type: String,
      enum: ["normal", "especial"],
      default: "normal",
      index: true,
    },
    commissionRate: { type: Number, default: 0.1, min: 0, max: 1 },
    paymentStatus: {
      type: String,
      enum: ["pagado", "senado", "pendiente"],
      default: "pendiente",
      index: true,
    },
    importKey: { type: String, default: "", index: true },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("VentaMensual", VentaMensualSchema);
