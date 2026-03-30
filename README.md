# Surmaderas Gestion

Aplicacion web interna para Sur Maderas orientada a la gestion comercial y operativa del negocio.

Hoy el sistema cubre autenticacion, consulta de productos, carga y listado de notas de pedido, seguimiento de notas guardadas en caja, un calendario local, un generador simple de presupuestos y un modulo 3D para armado de muebles.

## Estado actual

El proyecto esta funcionalmente encaminado, pero todavia esta en una etapa de consolidacion tecnica.

Conviven:

- modulos ya bastante orientados a negocio real
- una separacion clara entre `client/` y `server/`
- una migracion parcial hacia una arquitectura mas modular por features
- deuda tecnica en autenticacion, servicios duplicados, rutas no protegidas y lint pendiente

## Stack

- Frontend: React 19 + Vite
- Routing: React Router
- UI: CSS propio y clases utilitarias
- 3D: `three`, `@react-three/fiber`, `@react-three/drei`
- PDF: `jspdf`
- Backend: Node.js + Express
- Base de datos: MongoDB + Mongoose
- Autenticacion: JWT
- Hash de passwords: bcrypt

## Modulos disponibles

### Frontend

- Login de usuario
- Dashboard inicial
- Calendario mensual local con eventos guardados en `localStorage`
- Alta/carga de notas de pedido
- Listado de notas de pedido
- Vista de notas guardadas en caja
- Consulta paginada de productos
- Generador rapido de presupuestos
- Generador 3D de muebles

### Backend

- Login con JWT
- Seed de usuario admin
- Reset de password de admin
- Listado de productos con busqueda y paginado
- CRUD parcial de notas de pedido
- Marcado de notas como guardadas en caja
- Modelos de usuarios, productos, notas de pedido, clientes y contador

## Estructura del proyecto

```text
Surmaderas-gestion/
|-- client/
|   |-- public/
|   |-- src/
|   |   |-- app/
|   |   |-- css/
|   |   |-- features/
|   |   |-- layouts/
|   |   |-- pages/
|   |   `-- services/
|   |-- package.json
|   `-- vite.config.js
|-- server/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- seed/
|   |   `-- utils/
|   |-- package.json
|   `-- .env
`-- README.md
```

## Arquitectura resumida

### Cliente

El frontend arranca desde `client/src/main.jsx` y centraliza rutas en `client/src/app/router.jsx`.

La app mezcla dos estilos:

- paginas simples dentro de `pages/`
- features encapsuladas dentro de `features/`

La parte mas modular hoy esta en:

- `features/notasPedido`
- `features/notasPedidoListado`
- `features/muebles3d`

### Servidor

El backend arranca desde `server/src/index.js`, monta CORS, parsers JSON y las rutas principales.

Rutas montadas hoy:

- `/auth`
- `/api/productos`
- `/api/notas-pedido`
- `/api/health`

Hay modulos preparados pero todavia no conectados en runtime, como `clients.routes.js`.

## Variables de entorno

Crear `server/.env`:

```env
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>
JWT_SECRET=una_clave_larga_y_segura
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

Opcional en `client/.env`:

```env
VITE_API_URL=http://localhost:4000
```

## Instalacion

```bash
git clone https://github.com/Maturojo/Surmaderas-App.git
cd Surmaderas-gestion
cd server
npm install
cd ../client
npm install
```

## Desarrollo

### Backend

```bash
cd server
npm run dev
```

API esperada en:

```text
http://localhost:4000
```

Healthcheck:

```http
GET /api/health
```

Respuesta esperada:

```json
{ "ok": true }
```

### Frontend

```bash
cd client
npm run dev
```

App esperada en:

```text
http://localhost:5173
```

## Scripts

### Client

- `npm run dev`: inicia Vite
- `npm run build`: genera build de produccion
- `npm run lint`: ejecuta ESLint
- `npm run preview`: previsualiza el build

### Server

- `npm run dev`: inicia backend con nodemon
- `npm start`: inicia backend con Node
- `npm test`: placeholder, aun sin tests reales

## API resumida

### Auth

#### `POST /auth/login`

Body:

```json
{
  "username": "admin",
  "password": "admin"
}
```

Respuesta:

```json
{
  "token": "jwt",
  "user": {
    "id": "mongo-id",
    "name": "Administrador",
    "username": "admin",
    "role": "admin"
  }
}
```

#### `POST /auth/seed-admin`

Crea el usuario admin si no existe.

#### `POST /auth/reset-admin-password`

Resetea la clave del admin.

### Productos

#### `GET /api/productos?q=&page=1&limit=25`

Lista productos con filtro por `nombre` o `codigo`.

### Notas de pedido

#### `GET /api/notas-pedido`

Lista notas con busqueda y paginado.

#### `POST /api/notas-pedido`

Crea una nota de pedido.

#### `GET /api/notas-pedido/:id`

Obtiene una nota por id.

#### `DELETE /api/notas-pedido/:id`

Elimina una nota.

#### `PATCH /api/notas-pedido/:id/guardar-caja`

Marca una nota como pagada o señada y guarda datos de caja.

## Modelos de datos

### `User`

- `name`
- `username`
- `passwordHash`
- `role`
- `isActive`

### `Producto`

- `codigo`
- `nombre`
- `precio`
- `unidad`
- `activo`

### `NotaPedido`

- `numero`
- `fecha`
- `entrega`
- `cliente`
- `vendedor`
- `items`
- `total`
- `estado`
- `caja`

### `Client`

- `name`
- `phone`
- `email`
- `notes`

## Estado tecnico observado

### Fortalezas

- Buena separacion entre frontend y backend
- Modelos de negocio concretos y utiles
- Base funcional para seguir creciendo
- Intento de modularizacion por feature en frontend
- Backend sencillo de entender y mantener

### Deuda tecnica actual

- El token se maneja de forma inconsistente entre servicios del cliente
- Hay servicios duplicados para notas de pedido
- Varias rutas sensibles no usan `requireAuth`
- Existen endpoints de admin que conviene limitar a desarrollo
- Hay modulos backend creados pero no montados
- El frontend tiene errores de lint pendientes
- No hay tests automatizados reales

## Problemas conocidos

- `npm run lint` falla actualmente en el cliente
- El modulo 3D concentra gran parte de los errores de lint
- Hay imports y estados sin uso en algunos componentes
- El router mezcla componente y export de configuracion en el mismo archivo
- El build no pudo verificarse en este entorno por una restriccion de ejecucion (`spawn EPERM`), no necesariamente por un error del proyecto

## Todo list

### Prioridad alta

- [ ] Unificar el manejo de autenticacion en frontend
- [ ] Usar un unico origen de token y headers de auth
- [ ] Proteger en backend las rutas de productos y notas de pedido con `requireAuth`
- [ ] Restringir o remover `/auth/seed-admin` y `/auth/reset-admin-password` en produccion
- [ ] Eliminar duplicacion entre `notasPedido.js` y `notasPedidoService.js`
- [ ] Normalizar URLs de API para que todo use `/api/...`
- [ ] Corregir errores de lint del cliente

### Prioridad media

- [ ] Conectar o eliminar `clients.routes.js` segun se vaya a usar
- [ ] Separar mejor pages, features y servicios compartidos
- [ ] Agregar validaciones de payload en backend
- [ ] Mejorar manejo de errores HTTP en todas las rutas
- [ ] Agregar roles y permisos reales por modulo
- [ ] Persistir calendario en backend si deja de ser solo local
- [ ] Conectar presupuestos a PDF y/o base de datos

### Prioridad baja

- [ ] Agregar tests unitarios y de integracion
- [ ] Agregar `.env.example`
- [ ] Documentar mejor seeds y datos iniciales
- [ ] Incorporar auditoria de cambios
- [ ] Agregar exportacion de notas y presupuestos
- [ ] Revisar UI general y consistencia visual
- [ ] Revisar encoding de textos para evitar caracteres rotos

## Sugerencia de siguiente etapa

El mejor siguiente paso no es agregar mas pantallas, sino consolidar la base:

1. seguridad y auth
2. limpieza de servicios duplicados
3. correccion de lint
4. tests minimos
5. nuevas features

## Autor

Matias Rojo  
Sur Maderas, Mar del Plata
