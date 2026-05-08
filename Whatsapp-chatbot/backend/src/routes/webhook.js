const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const { sendMessage, sendImage, markAsRead } = require('../services/meta');
const { findAnswer, getDefaultResponse, isWithinSchedule, getConfig, handleBudgetFlow, searchProducts, getCatalog } = require('../services/botLogic');
const { sendSurvey } = require('../services/reminders');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// Set para deduplicar mensajes ya procesados
const processedIds = new Set();

// GET - Verificación del webhook con Meta
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook de Meta verificado');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST - Mensajes entrantes desde Meta
router.post('/', async (req, res) => {
  // Responder 200 inmediatamente para que Meta no reintente
  res.sendStatus(200);

  try {
    const io = req.io;
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    if (!change || !change.messages) return;

    const messages = change.messages;
    const contacts = change.contacts || [];

    for (const msg of messages) {
      // Solo texto por ahora
      if (msg.type !== 'text') continue;

      const msgId = msg.id;
      if (processedIds.has(msgId)) continue;
      processedIds.add(msgId);
      // Limpiar set si crece mucho
      if (processedIds.size > 1000) processedIds.clear();

      const phone = msg.from;
      const text = msg.text.body;
      const contactName = contacts.find(c => c.wa_id === phone)?.profile?.name || 'Desconocido';

      // Marcar como leído
      await markAsRead(msgId);

      let conv = await Conversation.findOne({ phone });
      const isNew = !conv;
      if (!conv) conv = new Conversation({ phone, name: contactName, messages: [] });

      if (conv.reminderSent) conv.reminderSent = false;

      conv.messages.push({ from: 'customer', body: text });
      conv.lastMessage = new Date();

      io.emit('new_message', { phone, name: contactName, message: { from: 'customer', body: text, timestamp: new Date() } });

      // Capturar respuesta de encuesta (1-5)
      if (conv.surveyPending && /^[1-5]$/.test(text.trim())) {
        const rating = parseInt(text.trim());
        conv.surveyRating = rating;
        conv.surveyPending = false;
        const thanks = `¡Gracias por tu calificación! ${'⭐'.repeat(rating)} Valoramos mucho tu opinión 🙌`;
        conv.messages.push({ from: 'bot', body: thanks });
        await conv.save();
        await sendMessage(phone, thanks);
        io.emit('bot_reply', { phone, message: { from: 'bot', body: thanks, timestamp: new Date() } });
        continue;
      }

      if (conv.status === 'human') {
        await conv.save();
        continue;
      }

      // Verificar si el bot está habilitado
      const botEnabled = await getConfig('bot_enabled', 'true');
      if (botEnabled !== 'true') {
        await conv.save();
        continue;
      }

      // Verificar horario
      const open = await isWithinSchedule();
      if (!open) {
        const closedMsg = await getConfig('closed_message', '🕐 Estamos fuera del horario de atención. Te respondemos pronto.');
        conv.messages.push({ from: 'bot', body: closedMsg });
        await conv.save();
        await sendMessage(phone, closedMsg);
        io.emit('bot_reply', { phone, message: { from: 'bot', body: closedMsg, timestamp: new Date() } });
        continue;
      }

      // Mensaje de bienvenida
      if (isNew || conv.isFirstMessage) {
        const welcomeEnabled = await getConfig('welcome_enabled', 'true');
        if (welcomeEnabled === 'true') {
          const welcomeMsg = await getConfig('welcome_message', '¡Bienvenido/a a Sur Maderas! 🪵');
          conv.isFirstMessage = false;
          conv.messages.push({ from: 'bot', body: welcomeMsg });
          await conv.save();
          await sendMessage(phone, welcomeMsg);
          io.emit('bot_reply', { phone, message: { from: 'bot', body: welcomeMsg, timestamp: new Date() } });
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      let botReply = null;
      let imageUrl = null;

      // Catálogo
      const catalogReply = await getCatalog(text);
      if (catalogReply) {
        botReply = catalogReply;
      } else {
        const productResult = await searchProducts(text);
        if (productResult) {
          botReply = productResult.reply;
          imageUrl = productResult.imageUrl || null;
        } else {
          const budgetReply = await handleBudgetFlow(conv, text);
          if (budgetReply) {
            botReply = budgetReply;
          } else {
            const answer = await findAnswer(text);
            if (answer) {
              botReply = answer;
            } else {
              botReply = await getDefaultResponse();
              conv.status = 'human';
              sendSurvey; // no enviar encuesta acá, solo al cerrar manualmente
            }
          }
        }
      }

      conv.messages.push({ from: 'bot', body: botReply });
      await conv.save();

      if (imageUrl) {
        try {
          await sendImage(phone, imageUrl);
        } catch (e) {
          console.error('Error enviando imagen:', e.message);
        }
      }

      await sendMessage(phone, botReply);
      io.emit('bot_reply', { phone, message: { from: 'bot', body: botReply, timestamp: new Date() } });
    }
  } catch (err) {
    console.error('[Webhook] error:', err.message);
  }
});

module.exports = router;
