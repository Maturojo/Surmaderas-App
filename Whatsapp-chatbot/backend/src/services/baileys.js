const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const path = require('path');
const Conversation = require('../models/Conversation');
const { findAnswer, getDefaultResponse, isWithinSchedule, getConfig, handleBudgetFlow, searchProducts, getCatalog } = require('./botLogic');
const { startReminderCron, setSock, setIo } = require('./reminders');

let sock = null;

const connectToWhatsApp = async (io) => {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, '../../auth_info'));
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  setSock(sock);
  setIo(io);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Escaneá este QR con WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) connectToWhatsApp(io);
    }
    if (connection === 'open') {
      console.log('✅ WhatsApp conectado via Baileys');
      io.emit('whatsapp_status', { connected: true });
      startReminderCron();
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid.endsWith('@g.us')) continue;

      const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '');
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      if (!text) continue;

      const contactName = msg.pushName || 'Desconocido';

      let conv = await Conversation.findOne({ phone });
      const isNew = !conv;
      if (!conv) conv = new Conversation({ phone, name: contactName, messages: [] });

      // Resetear reminder si el cliente volvió a escribir
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
        await sock.sendMessage(msg.key.remoteJid, { text: thanks });
        io.emit('bot_reply', { phone, message: { from: 'bot', body: thanks, timestamp: new Date() } });
        continue;
      }

      if (conv.status === 'human') {
        await conv.save();
        continue;
      }

      // Verificar si el bot está habilitado globalmente
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
        await sock.sendMessage(msg.key.remoteJid, { text: closedMsg });
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
          await sock.sendMessage(msg.key.remoteJid, { text: welcomeMsg });
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
        // Búsqueda de producto
        const productResult = await searchProducts(text);
        if (productResult) {
          botReply = productResult.reply;
          imageUrl = productResult.imageUrl || null;
        } else {
          // Flujo de presupuesto
          const budgetReply = await handleBudgetFlow(conv, text);
          if (budgetReply) {
            botReply = budgetReply;
          } else {
            // FAQs
            const answer = await findAnswer(text);
            if (answer) {
              botReply = answer;
            } else {
              botReply = await getDefaultResponse();
              conv.status = 'human';
            }
          }
        }
      }

      conv.messages.push({ from: 'bot', body: botReply });
      await conv.save();

      // Si hay imagen, enviarla primero
      if (imageUrl) {
        try {
          await sock.sendMessage(msg.key.remoteJid, { image: { url: imageUrl }, caption: '' });
        } catch (e) {
          console.error('Error enviando imagen:', e.message);
        }
      }

      await sock.sendMessage(msg.key.remoteJid, { text: botReply });
      io.emit('bot_reply', { phone, message: { from: 'bot', body: botReply, timestamp: new Date() } });
    }
  });
};

const sendMessage = async (phone, text) => {
  if (!sock) throw new Error('WhatsApp no conectado');
  await sock.sendMessage(`${phone}@s.whatsapp.net`, { text });
};

module.exports = { connectToWhatsApp, sendMessage };
