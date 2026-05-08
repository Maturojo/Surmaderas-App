require('dotenv').config();
const mongoose = require('mongoose');
const FAQ = require('./src/models/FAQ');

const faqs = [
  {
    question: '¿Cuáles son los horarios de atención?',
    keywords: ['horario', 'horarios', 'atienden', 'abren', 'cierran', 'cuando atienden', 'laboral', 'lunes', 'sabado', 'sábado'],
    answer: '🕐 Atendemos de lunes a viernes de 9 a 18hs y sábados de 9 a 13hs. Fuera de ese horario podés dejarnos tu consulta y te respondemos a la brevedad 😊',
  },
  {
    question: '¿Cuáles son los precios?',
    keywords: ['precio', 'vale', 'valor', 'cuanto sale', 'cuánto sale', 'cuanto cuesta', 'cuánto cuesta', 'costo', 'presupuesto'],
    answer: '¡Hola! 👋 Los precios varían según medidas, material y terminación. Contanos qué necesitás y te armamos un presupuesto personalizado 🪵',
  },
  {
    question: '¿Hacen trabajos a medida?',
    keywords: ['medida', 'personalizado', 'encargo', 'a pedido', 'custom', 'especial'],
    answer: '¡Sí! Trabajamos 100% a medida. Nos adaptamos a tu espacio y estilo. Mandanos las medidas y te asesoramos 📐',
  },
  {
    question: '¿Dónde están ubicados?',
    keywords: ['ubicacion', 'ubicación', 'donde estan', 'dónde están', 'direccion', 'dirección', 'local', 'donde queda'],
    answer: '📍 Estamos en Mar del Plata. Escribinos para coordinar una visita o enviamos fotos de los productos por acá.',
  },
  {
    question: '¿Hacen envíos?',
    keywords: ['envio', 'envío', 'mandan', 'flete', 'llevan', 'delivery', 'despacho'],
    answer: '✅ Sí, hacemos envíos dentro de Mar del Plata y alrededores. El costo de flete depende de la distancia y el tamaño del pedido.',
  },
  {
    question: '¿Cuánto tarda la fabricación?',
    keywords: ['tiempo', 'cuanto tarda', 'cuánto tarda', 'demora', 'dias', 'días', 'semanas', 'plazo'],
    answer: '⏱️ El plazo de fabricación es de 2 a 4 semanas dependiendo del producto y la carga de trabajo. Te confirmamos la fecha exacta al tomar el pedido.',
  },
  {
    question: '¿Qué materiales usan?',
    keywords: ['material', 'madera', 'mdf', 'melamina', 'roble', 'pino', 'cedro', 'calidad', 'tipo de madera'],
    answer: '🌳 Trabajamos con distintos tipos de madera maciza, MDF y melamina. Te asesoramos según tu presupuesto y uso.',
  },
  {
    question: '¿Tienen catálogo o Instagram?',
    keywords: ['catalogo', 'catálogo', 'foto', 'fotos', 'instagram', 'ver productos', 'trabajos', 'portfolio'],
    answer: '📸 Podés ver nuestros trabajos en Instagram @surmaderas.mdp — ¡subimos proyectos seguido! También podemos mandarte fotos específicas de lo que buscás.',
  },
  {
    question: '¿Hacen muebles de cocina?',
    keywords: ['cocina', 'alacena', 'bajo mesada', 'cajones', 'mueble de cocina', 'despensa'],
    answer: '🍳 ¡Sí! Hacemos muebles de cocina a medida: bajo mesadas, alacenas, despensas y más. Mandanos las medidas del espacio y te hacemos un presupuesto.',
  },
  {
    question: '¿Hacen mesas?',
    keywords: ['mesa', 'mesita', 'mesa de comedor', 'mesa ratona', 'mesa de luz'],
    answer: '🪵 ¡Claro! Hacemos mesas de comedor, ratonas, de luz y más. Todo a medida. ¿Qué tipo de mesa necesitás y de qué tamaño?',
  },
  {
    question: '¿Hacen placares o vestidores?',
    keywords: ['placar', 'placard', 'vestidor', 'ropero', 'armario', 'guardarropa'],
    answer: '👕 Sí, hacemos placares y vestidores a medida con distintas configuraciones internas. Mandanos las medidas del espacio.',
  },
  {
    question: '¿Hacen escritorios?',
    keywords: ['escritorio', 'desk', 'home office', 'oficina', 'computadora'],
    answer: '💻 ¡Sí! Hacemos escritorios a medida, simples o con cajoneras, para home office o estudio. Contanos el espacio que tenés.',
  },
  {
    question: '¿Hacen estanterías o bibliotecas?',
    keywords: ['estanteria', 'estantería', 'biblioteca', 'repisa', 'repisas', 'estante', 'flotante'],
    answer: '📚 Sí, hacemos estanterías, bibliotecas y repisas flotantes a medida. Podemos adaptarlas a cualquier pared o espacio.',
  },
  {
    question: '¿Cuáles son las formas de pago?',
    keywords: ['pago', 'pagar', 'efectivo', 'transferencia', 'tarjeta', 'mercado pago', 'financiacion', 'financiación'],
    answer: '💳 Aceptamos efectivo, transferencia bancaria y Mercado Pago. Consultanos sobre señas y formas de pago según el proyecto.',
  },
  {
    question: '¿Hacen muebles de baño?',
    keywords: ['baño', 'vanitory', 'mueble de baño', 'botiquin', 'botiquín'],
    answer: '🛁 Sí, hacemos vanitories y muebles de baño a medida con terminaciones resistentes a la humedad. Mandanos las medidas y te cotizamos.',
  },
  {
    question: '¿Tienen stock o todo es por encargo?',
    keywords: ['stock', 'disponible', 'en stock', 'ya hecho', 'listo', 'inmediato'],
    answer: '📦 Algunos productos los tenemos en stock y otros los fabricamos por encargo. Escribinos qué necesitás y te decimos disponibilidad y tiempos.',
  },
  {
    question: '¿Hacen instalación?',
    keywords: ['instalan', 'instalacion', 'instalación', 'montan', 'colocan', 'arman', 'montaje'],
    answer: '🔧 Sí, nos encargamos de la instalación en tu domicilio. El costo se cotiza por separado según la complejidad y ubicación.',
  },
  {
    question: '¿Cómo arranco un pedido?',
    keywords: ['como arranco', 'cómo arranco', 'como hago', 'cómo hago', 'quiero encargar', 'quiero pedir', 'empezar'],
    answer: '✍️ ¡Fácil! Contanos qué mueble necesitás, las medidas del espacio y si tenés alguna referencia. Con eso te armamos un presupuesto sin compromiso 😊',
  },
  {
    question: '¿Hacen sillas?',
    keywords: ['silla', 'sillas', 'banco', 'banqueta', 'taburete', 'sillon', 'sillón'],
    answer: '🪑 Sí, hacemos sillas, bancos y banquetas a medida. También podemos combinarlas con mesas para que todo tenga el mismo estilo.',
  },
  {
    question: '¿Hacen muebles para jardín?',
    keywords: ['jardin', 'jardín', 'exterior', 'terraza', 'patio', 'deck', 'galeria', 'galería'],
    answer: '🌿 ¡Sí! Trabajamos con maderas tratadas para exterior. Mesas, bancos, decks y más. Consultanos qué necesitás.',
  },
  {
    question: '¿Puedo visitar el taller?',
    keywords: ['taller', 'visitar', 'visita', 'showroom', 'conocer'],
    answer: '🏭 ¡Claro! Podés venir a conocer el taller y ver los materiales en persona. Coordinamos una visita por acá.',
  },
  {
    question: '¿Qué terminaciones tienen?',
    keywords: ['terminacion', 'terminación', 'pintura', 'barniz', 'laqueado', 'color', 'natural', 'lustrado'],
    answer: '🎨 Ofrecemos terminaciones: natural, barnizado, laqueado en colores a elección, o pintado. Te mostramos muestras para que elijas.',
  },
  {
    question: '¿Tienen garantía?',
    keywords: ['garantia', 'garantía', 'problema', 'defecto', 'roto', 'falla'],
    answer: '✅ Todos nuestros productos tienen garantía. Si hay algún problema con la fabricación o terminación, lo solucionamos sin costo 🪵',
  },
  {
    question: '¿Hacen reparaciones?',
    keywords: ['reparacion', 'reparación', 'reparar', 'restaurar', 'restauracion', 'reforma', 'arreglo', 'arreglar'],
    answer: '🔨 Sí, hacemos reparaciones y restauraciones de muebles. Mandanos fotos y te decimos si podemos ayudarte.',
  },
  {
    question: '¿Se puede pagar en cuotas?',
    keywords: ['cuotas', 'financiar', 'financiamiento', 'credito', 'crédito', 'en partes', 'dividir'],
    answer: '💰 Sí, manejamos planes de pago. Generalmente pedimos una seña para arrancar y el saldo contra entrega. Consultanos según el monto.',
  },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await FAQ.insertMany(faqs);
  console.log(`✅ ${faqs.length} FAQs cargadas`);
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
