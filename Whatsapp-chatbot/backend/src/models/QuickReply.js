const mongoose = require('mongoose');

const quickReplySchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('QuickReply', quickReplySchema);
