import mongoose from "mongoose";

const EncuestaClienteSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    ivaCondition: {
      type: String,
      required: true,
      enum: ["consumidor_final", "monotributista", "responsable_inscripto", "exento"],
    },
    taxIdType: { type: String, required: true, enum: ["DNI", "CUIL", "CUIT"] },
    taxId: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5, default: null },
    purchasedProducts: [{ type: String, trim: true }],
    choiceReasons: [{ type: String, trim: true }],
    purchaseDriver: {
      type: String,
      enum: ["emprendimiento", "personal", ""],
      default: "",
    },
    npsChoice: {
      type: String,
      enum: ["seguro", "probablemente", "no_se", ""],
      default: "",
    },
    improvement: { type: String, default: "", trim: true },
    couponCode: { type: String, required: true, unique: true, trim: true },
    couponDiscount: { type: Number, required: true, default: 15 },
    couponUsed: { type: Boolean, default: false },
    couponUsedAt: { type: Date, default: null },
    couponUsedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("EncuestaCliente", EncuestaClienteSchema);
