const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  keywords: [{ type: String, required: true }], // palabras clave para matchear
  question: { type: String, required: true },   // pregunta de ejemplo
  answer: { type: String, required: true },      // respuesta del bot
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('FAQ', faqSchema);
