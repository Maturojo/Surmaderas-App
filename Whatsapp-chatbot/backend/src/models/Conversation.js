const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: { type: String, enum: ['customer', 'bot', 'agent'], required: true },
  body: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const noteSchema = new mongoose.Schema({
  body: { type: String, required: true },
  author: { type: String, default: 'Agente' },
  timestamp: { type: Date, default: Date.now },
});

const budgetFlowSchema = new mongoose.Schema({
  active: { type: Boolean, default: false },
  step: { type: Number, default: 0 }, // 1=mueble, 2=medidas, 3=estilo, 4=completo
  mueble: String,
  medidas: String,
  estilo: String,
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, default: 'Desconocido' },
  messages: [messageSchema],
  notes: [noteSchema],
  status: { type: String, enum: ['bot', 'human', 'closed'], default: 'bot' },
  tags: [{ type: String }],
  isFirstMessage: { type: Boolean, default: true },
  budgetFlow: { type: budgetFlowSchema, default: () => ({}) },
  lastMessage: { type: Date, default: Date.now },
  reminderSent: { type: Boolean, default: false },
  surveyPending: { type: Boolean, default: false },
  surveyRating: { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
