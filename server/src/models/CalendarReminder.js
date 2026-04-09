import mongoose from "mongoose";

const CalendarReminderSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "", trim: true },
    fecha: { type: String, required: true, trim: true },
    prioridad: {
      type: String,
      enum: ["baja", "media", "alta"],
      default: "media",
    },
    completado: { type: Boolean, default: false },
    creadoPor: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("CalendarReminder", CalendarReminderSchema);
