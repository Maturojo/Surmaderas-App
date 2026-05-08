const express = require('express');
const router = express.Router();
const Config = require('../models/Config');

const DEFAULTS = {
  default_response: '¡Hola! 👋 Gracias por contactar a Sur Maderas. En breve un asesor te responde. También podés visitar nuestro Instagram @surmaderas.mdp para ver más productos 🪵',
  business_name: 'Sur Maderas',
  instagram: '@surmaderas.mdp',
  welcome_message: '¡Bienvenido/a a Sur Maderas! 🪵 Soy el asistente automático. Podés preguntarme sobre precios, materiales, tiempos de entrega, o escribir *presupuesto* para que te ayude a armar uno.',
  welcome_enabled: 'true',
  closed_message: '🕐 Estamos fuera del horario de atención. Atendemos lunes a viernes de 9 a 18hs y sábados de 9 a 13hs. Te respondemos a la brevedad 😊',
  schedule_enabled: 'false',
  schedule_open: '09:00',
  schedule_close: '18:00',
  schedule_days: '1,2,3,4,5', // lunes a viernes
  bot_enabled: 'true',
};

router.get('/', async (req, res) => {
  try {
    const docs = await Config.find();
    const config = { ...DEFAULTS };
    docs.forEach(d => config[d.key] = d.value);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await Config.findOneAndUpdate({ key }, { value }, { upsert: true });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
