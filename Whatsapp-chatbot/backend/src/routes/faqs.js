const express = require('express');
const router = express.Router();
const FAQ = require('../models/FAQ');

router.get('/', async (req, res) => {
  const faqs = await FAQ.find().sort({ createdAt: -1 });
  res.json(faqs);
});

router.post('/', async (req, res) => {
  try {
    const faq = new FAQ(req.body);
    await faq.save();
    res.status(201).json(faq);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(faq);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  await FAQ.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
