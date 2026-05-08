const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const { sendMessage } = require('../services/meta');
const { sendSurvey } = require('../services/reminders');

// Listar conversaciones con filtros opcionales
router.get('/', async (req, res) => {
  try {
    const { search, status, tag } = req.query;
    const query = {};
    if (status) query.status = status;
    if (tag) query.tags = tag;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];

    const conversations = await Conversation.find(query)
      .select('phone name status lastMessage messages tags budgetFlow')
      .sort({ lastMessage: -1 });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener una conversación completa
router.get('/:phone', async (req, res) => {
  try {
    const conv = await Conversation.findOne({ phone: req.params.phone });
    if (!conv) return res.status(404).json({ error: 'No encontrada' });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar mensaje manual desde el agente
router.post('/:phone/reply', async (req, res) => {
  try {
    const { body } = req.body;
    const { phone } = req.params;

    const conv = await Conversation.findOne({ phone });
    if (!conv) return res.status(404).json({ error: 'No encontrada' });

    conv.messages.push({ from: 'agent', body });
    conv.lastMessage = new Date();
    await conv.save();

    await sendMessage(phone, body);
    req.io.emit('agent_reply', { phone, message: { from: 'agent', body, timestamp: new Date() } });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cambiar estado
router.patch('/:phone/status', async (req, res) => {
  try {
    const { status } = req.body;
    const conv = await Conversation.findOneAndUpdate(
      { phone: req.params.phone },
      { status },
      { new: true }
    );
    req.io.emit('status_change', { phone: req.params.phone, status });
    // Enviar encuesta al cerrar
    if (status === 'closed') sendSurvey(req.params.phone);
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agregar nota interna
router.post('/:phone/notes', async (req, res) => {
  try {
    const { body, author } = req.body;
    const conv = await Conversation.findOneAndUpdate(
      { phone: req.params.phone },
      { $push: { notes: { body, author: author || 'Agente' } } },
      { new: true }
    );
    if (!conv) return res.status(404).json({ error: 'No encontrada' });
    res.json(conv.notes[conv.notes.length - 1]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar etiquetas
router.patch('/:phone/tags', async (req, res) => {
  try {
    const { tags } = req.body;
    const conv = await Conversation.findOneAndUpdate(
      { phone: req.params.phone },
      { tags },
      { new: true }
    );
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
