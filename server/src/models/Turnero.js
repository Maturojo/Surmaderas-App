import mongoose from "mongoose";

const TurneroSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    currentNumber: { type: Number, required: true, default: 1 },
    lastTakenNumber: { type: Number, default: null },
    lastTakenBy: { type: String, default: "" },
    takenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Turnero", TurneroSchema);
