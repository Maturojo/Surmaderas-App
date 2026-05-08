import mongoose from "mongoose";

const VentaTransferenciaSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },
    month: { type: String, required: true, index: true },
    number: { type: String, default: "", trim: true },
    origin: { type: String, default: "", trim: true },
    destination: { type: String, default: "", trim: true },
    detail: { type: String, default: "", trim: true },
    client: { type: String, default: "", trim: true },
    contact: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["recibida", "pendiente", "conciliada"],
      default: "recibida",
      index: true,
    },
    importKey: { type: String, default: "", index: true },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("VentaTransferencia", VentaTransferenciaSchema);
