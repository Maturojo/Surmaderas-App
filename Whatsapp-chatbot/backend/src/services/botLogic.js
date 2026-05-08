const FAQ = require('../models/FAQ');
const Config = require('../models/Config');
const BudgetRequest = require('../models/BudgetRequest');
const axios = require('axios');

const SURMADERAS_API = process.env.SURMADERAS_API_URL || 'http://localhost:4000';

const FALLBACK = '¡Hola! 👋 Gracias por contactar a Sur Maderas. En breve un asesor te responde.';

// Lee un valor de config de la DB
const getConfig = async (key, fallback = '') => {
  const doc = await Config.findOne({ key });
  return doc?.value ?? fallback;
};

// Verifica si estamos dentro del horario de atención
const isWithinSchedule = async () => {
  const enabled = await getConfig('schedule_enabled', 'false');
  if (enabled !== 'true') return true; // si no está activado, siempre "abierto"

  const now = new Date();
  const day = now.getDay(); // 0=domingo, 1=lunes...
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const current = hours * 60 + minutes;

  const daysStr = await getConfig('schedule_days', '1,2,3,4,5');
  const days = daysStr.split(',').map(Number);
  if (!days.includes(day)) return false;

  const open = await getConfig('schedule_open', '09:00');
  const close = await getConfig('schedule_close', '18:00');
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);

  return current >= oh * 60 + om && current < ch * 60 + cm;
};

// Busca FAQ por keywords
const findAnswer = async (messageText) => {
  const text = messageText.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const faqs = await FAQ.find({ active: true });

  for (const faq of faqs) {
    const matched = faq.keywords.some(kw => {
      const keyword = kw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      return text.includes(keyword);
    });
    if (matched) return faq.answer;
  }
  return null;
};

const getDefaultResponse = async () => {
  return await getConfig('default_response', FALLBACK);
};

// Flujo de presupuesto - retorna respuesta y si debe continuar el flujo
const BUDGET_KEYWORDS = ['presupuesto', 'cotizacion', 'cotización', 'quiero encargar', 'quiero pedir', 'cuanto me saldria', 'cuánto me saldría'];

const handleBudgetFlow = async (conv, messageText) => {
  const text = messageText.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Iniciar flujo si no está activo y el mensaje tiene keyword de presupuesto
  if (!conv.budgetFlow?.active) {
    const wantsBudget = BUDGET_KEYWORDS.some(k => text.includes(k));
    if (!wantsBudget) return null;

    conv.budgetFlow = { active: true, step: 1 };
    return '¡Perfecto! Te ayudo a armar el presupuesto 📋\n\n*Paso 1 de 3:* ¿Qué mueble o producto necesitás? (ej: mesa de comedor, placard, escritorio)';
  }

  // Continuar flujo activo
  const step = conv.budgetFlow.step;

  if (step === 1) {
    conv.budgetFlow.mueble = messageText;
    conv.budgetFlow.step = 2;
    return '*Paso 2 de 3:* ¿Cuáles son las medidas aproximadas del espacio o del mueble? (ej: 1.80m x 0.90m)';
  }

  if (step === 2) {
    conv.budgetFlow.medidas = messageText;
    conv.budgetFlow.step = 3;
    return '*Paso 3 de 3:* ¿Tenés alguna referencia de estilo, material o color preferido? (podés escribir "sin preferencia")';
  }

  if (step === 3) {
    conv.budgetFlow.estilo = messageText;
    conv.budgetFlow.active = false;
    conv.budgetFlow.step = 4;
    conv.status = 'human'; // pasar a agente para que cotice

    // Guardar solicitud de presupuesto
    try {
      await BudgetRequest.create({
        phone: conv.phone,
        name: conv.name,
        mueble: conv.budgetFlow.mueble,
        medidas: conv.budgetFlow.medidas,
        estilo: messageText,
      });
    } catch (e) {
      console.error('Error guardando BudgetRequest:', e.message);
    }

    const resumen = `✅ ¡Listo! Recibimos tu consulta de presupuesto:\n\n🪵 *Mueble:* ${conv.budgetFlow.mueble}\n📐 *Medidas:* ${conv.budgetFlow.medidas}\n🎨 *Estilo/Material:* ${messageText}\n\nEn breve un asesor de Sur Maderas te contacta con el presupuesto. ¡Gracias! 😊`;
    return resumen;
  }

  return null;
};

// Palabras que indican búsqueda de producto
const PRODUCT_KEYWORDS = ['precio de', 'cuanto vale', 'cuánto vale', 'cuanto cuesta el', 'cuánto cuesta el', 'tienen el', 'tienen la', 'hay ', 'existe '];
const CATALOG_KEYWORDS = ['catalogo', 'catálogo', 'lista de productos', 'que productos tienen', 'qué productos tienen', 'que venden', 'qué venden'];

const normalize = (str) => str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Busca un producto en la base de datos principal
const searchProducts = async (messageText) => {
  const text = normalize(messageText);
  const hasKeyword = PRODUCT_KEYWORDS.some(k => text.includes(normalize(k)));
  if (!hasKeyword) return null;

  // Extraer término de búsqueda quitando las keywords
  let query = text;
  for (const k of PRODUCT_KEYWORDS) {
    query = query.replace(normalize(k), '').trim();
  }
  if (query.length < 2) return null;

  try {
    const { data } = await axios.get(`${SURMADERAS_API}/api/productos`, {
      params: { q: query, limit: 5 },
      timeout: 5000,
    });

    const items = data.items || [];
    if (!items.length) return null;

    const formatPrice = (p) => `$${Number(p).toLocaleString('es-AR')}`;
    const lines = items.map(p => `• *${p.nombre}* (${p.codigo}) — ${formatPrice(p.precio)} / ${p.unidad}`);
    const reply = `🔍 Encontré estos productos:\n\n${lines.join('\n')}\n\n¿Querés más info de alguno o un presupuesto? ¡Escribinos!`;

    const imageUrl = items.find(p => p.imagen)?.imagen || null;
    return { reply, imageUrl };
  } catch {
    return null;
  }
};

// Manda catálogo resumido por categoría
const getCatalog = async (messageText) => {
  const text = normalize(messageText);
  const hasCatalog = CATALOG_KEYWORDS.some(k => text.includes(normalize(k)));
  if (!hasCatalog) return null;

  try {
    const { data } = await axios.get(`${SURMADERAS_API}/api/productos/filtros`, { timeout: 5000 });
    const categorias = (data.categorias || []).filter(c => c !== 'Sin clasificar').slice(0, 10);
    if (!categorias.length) return null;

    const lines = categorias.map(c => `• ${c}`);
    return `📦 Nuestras categorías de productos:\n\n${lines.join('\n')}\n\n¿Sobre cuál querés consultar precios? Escribí el nombre y te busco los productos 🪵`;
  } catch {
    return null;
  }
};

module.exports = { findAnswer, getDefaultResponse, isWithinSchedule, getConfig, handleBudgetFlow, searchProducts, getCatalog };
