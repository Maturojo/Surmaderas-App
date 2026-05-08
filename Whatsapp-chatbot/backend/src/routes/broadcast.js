const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const { sendMessage } = require('../services/meta');

router.post('/', async (req, res) => {
  try {
    const { message, phones, filterStatus, filterTag } = req.body;
    if (!message) return res.status(400).json({ error: 'Falta el mensaje' });

    let targets = [];

    if (phones && phones.length > 0) {
      targets = phones;
    } else {
      const query = {};
      if (filterStatus) query.status = filterStatus;
      if (filterTag) query.tags = filterTag;
      const convs = await Conversation.find(query).select('phone');
      targets = convs.map(c => c.phone);
    }

    const results = { sent: 0, failed: 0, errors: [] };

    for (const phone of targets) {
      try {
        await sendMessage(phone, message);
        await Conversation.findOneAndUpdate(
          { phone },
          { $push: { messages: { from: 'agent', body: `[BROADCAST] ${message}` } }, lastMessage: new Date() }
        );
        results.sent++;
        // Pequeña pausa para no saturar
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        results.failed++;
        results.errors.push({ phone, error: e.message });
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
