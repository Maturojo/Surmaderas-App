import mongoose from "mongoose";

const chatConversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["general", "direct"], required: true },
    title: { type: String, trim: true, default: "" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastReadBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
    lastMessageText: { type: String, trim: true, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

chatConversationSchema.index({ type: 1 });
chatConversationSchema.index({ participants: 1, type: 1 });

export default mongoose.model("ChatConversation", chatConversationSchema);
