require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || '*' }
});

// Conectar DB
connectDB().then(() => {
  console.log('✅ Backend WhatsApp listo');
  require('./services/reminders').startReminderCron();
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Inyectar io en cada request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Webhook de Meta (debe ir ANTES del json parser para poder verificar firma si se quiere)
app.use('/webhook', require('./routes/webhook'));

// Rutas REST
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/faqs', require('./routes/faqs'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/config', require('./routes/config'));
app.use('/api/quick-replies', require('./routes/quickReplies'));
app.use('/api/broadcast', require('./routes/broadcast'));
app.use('/api/budget-requests', require('./routes/budgetRequests'));

// Socket.io
io.on('connection', (socket) => {
  console.log('Panel conectado:', socket.id);
  socket.on('disconnect', () => console.log('Panel desconectado:', socket.id));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`[WA] Servidor corriendo en puerto ${PORT}`));
