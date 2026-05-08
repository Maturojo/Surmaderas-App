const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');

router.get('/', async (req, res) => {
  try {
    const total = await Conversation.countDocuments();
    const byStatus = await Conversation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Mensajes totales y por origen
    const msgStats = await Conversation.aggregate([
      { $unwind: '$messages' },
      { $group: { _id: '$messages.from', count: { $sum: 1 } } }
    ]);

    // Conversaciones por día (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const byDay = await Conversation.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({ total, byStatus, msgStats, byDay });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
