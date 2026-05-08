const axios = require('axios');

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const BASE_URL = `https://graph.facebook.com/v20.0/${PHONE_ID}`;

const headers = () => ({
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
});

const sendMessage = async (phone, text) => {
  await axios.post(`${BASE_URL}/messages`, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: text },
  }, { headers: headers() });
};

const sendImage = async (phone, imageUrl, caption = '') => {
  await axios.post(`${BASE_URL}/messages`, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'image',
    image: { link: imageUrl, caption },
  }, { headers: headers() });
};

const markAsRead = async (messageId) => {
  try {
    await axios.post(`${BASE_URL}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }, { headers: headers() });
  } catch (_) { /* ignorar errores de read receipt */ }
};

module.exports = { sendMessage, sendImage, markAsRead };
