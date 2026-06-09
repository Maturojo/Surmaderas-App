import mongoose from "mongoose";

const EncuestaClienteSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    phoneNormalized: { type: String, default: "", trim: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    branch: { type: String, enum: ["luro", "independencia", ""], default: "" },
    ivaCondition: {
      type: String,
      required: true,
      enum: ["consumidor_final", "monotributista", "responsable_inscripto", "exento"],
    },
    taxIdType: { type: String, required: true, enum: ["DNI", "CUIL", "CUIT"] },
    taxId: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    birthDate: { type: String, default: "", trim: true },
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
    couponExpiresAt: { type: Date, default: null },
    couponUsed: { type: Boolean, default: false },
    couponUsedAt: { type: Date, default: null },
    couponUsedBy: { type: String, default: "" },
    welcomeNotificationSentAt: { type: Date, default: null },
    reminderNotificationSentAt: { type: Date, default: null },
    dopplerSyncedAt: { type: Date, default: null },
    dopplerSyncError: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("EncuestaCliente", EncuestaClienteSchema);
