# Surmaderas Gestión (Surmaderas-App)

Aplicación web interna para **gestión de Sur Maderas**: administración de productos y generación/gestión de notas de pedido, con autenticación y persistencia en MongoDB.

Repositorio: `Maturojo/Surmaderas-App`  
Estructura: `client/` + `server/` :contentReference[oaicite:1]{index=1}

---

## Tabla de contenidos
- [Stack](#stack)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Ejecución en desarrollo](#ejecución-en-desarrollo)
- [API (resumen)](#api-resumen)
- [Carga de imágenes](#carga-de-imágenes)
- [Build y despliegue](#build-y-despliegue)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

---

## Stack
- **Frontend (client):** React + Vite
- **Backend (server):** Node.js + Express
- **DB:** MongoDB (Mongoose)
- **Auth:** JWT
- **CORS:** configurable por `.env`

> Nota: El repo está compuesto mayormente por JavaScript. :contentReference[oaicite:2]{index=2}

---

## Estructura del proyecto

Surmaderas-App/
client/ # Frontend (Vite + React) 
GitHub

server/ # Backend (Express API) 
GitHub

.gitignore

yaml
Copiar código

---

## Requisitos
- Node.js 18+ (recomendado)
- npm 9+
- Cuenta/cluster de MongoDB (Atlas o local)

---

## Instalación

Clonar el repo:

```bash
git clone https://github.com/Maturojo/Surmaderas-App.git
cd Surmaderas-App
Instalar dependencias del backend:

bash
Copiar código
cd server
npm install
Instalar dependencias del frontend:

bash
Copiar código
cd ../client
npm install
Variables de entorno
Crear un archivo server/.env (o copiar desde un .env.example si lo agregás).

Ejemplo:

env
Copiar código
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=una_clave_larga_y_secreta
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
Opcional (frontend): si usás Vite con URL configurable, creá client/.env:

env
Copiar código
VITE_API_URL=http://localhost:4000
Ejecución en desarrollo
1) Levantar backend
bash
Copiar código
cd server
npm run dev
Debería iniciar en: http://localhost:4000

Healthcheck:

GET /api/health → { ok: true }

2) Levantar frontend
En otra terminal:

bash
Copiar código
cd client
npm run dev
Debería iniciar en: http://localhost:5173

API (resumen)
Auth
POST /auth/login
Body:

json
Copiar código
{ "username": "usuario", "password": "clave" }
Respuesta esperada: token JWT y datos del usuario.

Productos
GET /api/productos (con filtros tipo q, paginado, etc. según tu servicio)

POST /api/productos

PUT /api/productos/:id

DELETE /api/productos/:id

Notas de pedido
GET /api/notas-pedido

POST /api/notas-pedido

Importante: si protegés rutas, asegurate de enviar Authorization: Bearer <token>.

Carga de imágenes
El proyecto soporta productos con imagen. Estrategias típicas:

Guardar URL de imagen (hosteada en Cloudinary/S3/etc.)

Guardar base64 en MongoDB (para prototipo / uso interno)

Recomendación para producción: URL (más liviano y escalable).

Build y despliegue
Frontend
bash
Copiar código
cd client
npm run build
Backend
Configurar variables de entorno en el host (Render/Railway/VPS) y ejecutar:

bash
Copiar código
cd server
npm start
Asegurate de:

Setear CORS_ORIGIN al dominio del frontend publicado

Usar una JWT_SECRET fuerte

Verificar acceso a MongoDB (IP whitelist si usás Atlas)

Troubleshooting
CORS error: revisar CORS_ORIGIN en server/.env

Mongo timeout / buffering: confirmar MONGODB_URI + IP whitelist (Atlas)

Token inválido: revisar JWT_SECRET y expiración

Vite no encuentra dependencias: correr npm install en client/

Roadmap
 Roles (admin/empleado)

 Historial y export de notas de pedido (PDF/WhatsApp)

 Calendario de tareas + notas de pedido (vista mensual/semanal)

 Auditoría (quién crea/edita productos y notas)

 Subida de imágenes a storage externo (Cloudinary/S3)

Autor
Matías Rojo (Sur Maderas, Mar del Plata)
