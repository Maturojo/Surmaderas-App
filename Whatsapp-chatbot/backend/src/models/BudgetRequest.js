const mongoose = require('mongoose');

const budgetRequestSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  name: { type: String, default: 'Desconocido' },
  mueble: String,
  medidas: String,
  estilo: String,
  status: { type: String, enum: ['pendiente', 'en_proceso', 'enviado', 'descartado'], default: 'pendiente' },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('BudgetRequest', budgetRequestSchema);
