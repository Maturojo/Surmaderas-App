import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);
