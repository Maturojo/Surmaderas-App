const cron = require('node-cron');
const Conversation = require('../models/Conversation');
const { getConfig } = require('./botLogic');
const { sendMessage } = require('./meta');

let io = null;
const setIo = (i) => { io = i; };

// Corre cada hora
const startReminderCron = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const enabled = await getConfig('reminder_enabled', 'false');
      if (enabled !== 'true') return;

      const days = parseInt(await getConfig('reminder_days', '2'));
      const reminderMsg = await getConfig('reminder_message', '¡Hola! 👋 Queríamos saber si pudimos ayudarte. ¿Tenés alguna consulta pendiente? Estamos a tu disposición 🪵');

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const conversations = await Conversation.find({
        status: { $in: ['bot', 'human'] },
        lastMessage: { $lt: cutoff },
        reminderSent: { $ne: true },
      });

      for (const conv of conversations) {
        try {
          await sendMessage(conv.phone, reminderMsg);
          conv.messages.push({ from: 'bot', body: reminderMsg });
          conv.lastMessage = new Date();
          conv.reminderSent = true;
          await conv.save();
          if (io) io.emit('bot_reply', { phone: conv.phone, message: { from: 'bot', body: reminderMsg, timestamp: new Date() } });
          console.log(`[Recordatorio] enviado a ${conv.phone}`);
        } catch (err) {
          console.error(`[Recordatorio] error enviando a ${conv.phone}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Recordatorio] error en cron:', err.message);
    }
  });

  console.log('✅ Cron de recordatorios iniciado');
};

const sendSurvey = async (phone) => {
  try {
    const enabled = await getConfig('survey_enabled', 'true');
    if (enabled !== 'true') return;

    const surveyMsg = await getConfig('survey_message',
      '⭐ ¿Cómo calificarías la atención que recibiste?\n\nRespondé con un número del 1 al 5:\n1 ⭐ Muy mala\n2 ⭐⭐ Mala\n3 ⭐⭐⭐ Regular\n4 ⭐⭐⭐⭐ Buena\n5 ⭐⭐⭐⭐⭐ Excelente\n\n¡Gracias por elegirnos! 🪵'
    );

    await sendMessage(phone, surveyMsg);

    const conv = await Conversation.findOne({ phone });
    if (conv) {
      conv.messages.push({ from: 'bot', body: surveyMsg });
      conv.surveyPending = true;
      await conv.save();
      if (io) io.emit('bot_reply', { phone, message: { from: 'bot', body: surveyMsg, timestamp: new Date() } });
    }
  } catch (err) {
    console.error('[Encuesta] error:', err.message);
  }
};

module.exports = { startReminderCron, sendSurvey, setIo };
