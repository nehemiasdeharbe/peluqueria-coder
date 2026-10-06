# Peluquería Coder - Sistema Backend de Turnos y Reservas

API REST con Node.js, Express y persistencia en **MongoDB Atlas con Mongoose** que gestiona los recursos `services` (servicios de la peluquería) y `bookings` (reservas de los clientes). Incluye además el modelo `messages`, **vistas renderizadas en el servidor con Handlebars** y **actualizaciones en tiempo real con Socket.io**.

## Instalación

```bash
git clone https://github.com/nehemiasdeharbe/peluqueria-coder.git
cd peluqueria-coder
npm install
cp .env.example .env
```

Después editá `.env` y completá `MONGO_URI` con tu cadena de conexión de MongoDB Atlas (ver la sección siguiente). `PORT` y `NODE_ENV` ya traen valores de ejemplo funcionales.

### Configurar MongoDB Atlas

1. Creá un cluster gratuito (M0) en [MongoDB Atlas](https://www.mongodb.com/atlas).
2. En **Database Access**, creá un usuario con contraseña y permisos de lectura y escritura.
3. En **Network Access**, agregá tu IP actual (o `0.0.0.0/0` solo para desarrollo).
4. En **Connect → Drivers**, copiá la cadena de conexión y pegala en `MONGO_URI`, reemplazando `<usuario>` y `<password>` y agregando el nombre de la base (por ejemplo `peluqueria`) antes del `?`. Si la contraseña tiene caracteres especiales (`@`, `:`, `/`), hay que codificarlos (por ejemplo `@` → `%40`).

```
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/peluqueria?retryWrites=true&w=majority
```

El archivo `.env` está en `.gitignore`: la URI contiene credenciales y nunca se sube al repositorio.

## Ejecución

```bash
npm start
```

Modo desarrollo (reinicia al guardar cambios):

```bash
npm run dev
```

El servidor conecta primero con MongoDB y recién después empieza a escuchar en `http://localhost:<PORT>` (Express y Socket.io comparten el mismo servidor HTTP). Si la conexión falla, muestra el motivo (sin exponer la URI) y termina.

## Tests

```bash
npm test
```

Corre tests automatizados de las rutas con `node:test` y `supertest` (34 casos: servicios, reservas, vistas y eventos de Socket.io, incluyendo los códigos 200, 201, 400 y 404). Los tests usan **siempre una base aparte llamada `peluqueria_test`** dentro del mismo cluster, aunque `MONGO_URI` apunte a otra, y vacían sus colecciones al empezar y al terminar. Así nunca tocan los datos reales de la aplicación. Los archivos de tests corren en serie porque comparten esa base.

## Variables de entorno

| Variable    | Descripción                                   | Ejemplo                                              |
|-------------|------------------------------------------------|-------------------------------------------------------|
| `PORT`      | Puerto en el que corre el servidor             | `8082`                                                |
| `NODE_ENV`  | Entorno de ejecución                           | `development`                                         |
| `MONGO_URI` | Cadena de conexión de MongoDB Atlas            | `mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/peluqueria` |

Si falta alguna, la app no arranca y muestra un mensaje indicando cuál.

## Recurso `services`

```js
{
  id,          // string (ObjectId de MongoDB), generado automáticamente
  name,        // string
  description, // string
  duration,    // number, minutos, > 0
  price,       // number, >= 0
  category,    // string
  available    // boolean
}
```

### Endpoints

| Método | Ruta                    | Descripción                                   | Códigos     |
|--------|-------------------------|------------------------------------------------|-------------|
| GET    | `/api/services`         | Lista servicios (filtros `category`, `available`) | 200, 400  |
| GET    | `/api/services/:sid`    | Devuelve un servicio por id                    | 200, 404    |
| POST   | `/api/services`         | Crea un servicio (el id se genera solo)        | 201, 400    |
| PUT    | `/api/services/:sid`    | Actualiza un servicio                          | 200, 400, 404 |
| DELETE | `/api/services/:sid`    | Elimina un servicio                            | 200, 404    |

**Sobre `PUT`:** la implementación hace un **merge parcial** — solo pisa los campos que vengan en el body, el resto del servicio se conserva tal cual estaba. En términos estrictos de REST esto es más parecido a la semántica de `PATCH` que a la de `PUT` (que reemplazaría el recurso entero). Se documenta acá a propósito: para esta entrega se decidió mantener `PUT` por ser la ruta pedida en la consigna, pero el comportamiento es el de una actualización parcial.

**Ids inválidos:** un id que no tiene formato de ObjectId (por ejemplo `99999` o `abc`) no puede existir en la base, así que responde `404` igual que un id válido inexistente.

### Validaciones

- `POST`: valida que estén los 6 campos y que `duration`/`price` sean números válidos (> 0 y >= 0 respectivamente) y `available` sea booleano.
- `PUT`: valida los mismos tipos, pero solo para los campos que se envíen (nunca exige todos). Nunca permite modificar el `id`, aunque se envíe en el body.

## Recurso `bookings`

```js
{
  id,          // string (ObjectId de MongoDB), generado automáticamente
  clientName,  // string
  clientEmail, // string, formato de email válido
  date,        // string
  time,        // string
  status,      // string, por defecto "pendiente"
  services: [{ service: ObjectId, quantity: 1 }] // referencia al servicio por id; puede iniciar vacío
}
```

Los servicios de una reserva se guardan **como referencia (`ObjectId`)** al documento de la colección `services`, no como una copia del servicio. La respuesta de la API devuelve esos ids como string.

### Endpoints

| Método | Ruta                                   | Descripción                                      | Códigos     |
|--------|------------------------------------------|---------------------------------------------------|-------------|
| POST   | `/api/bookings`                          | Crea una reserva (`services` puede venir vacío)   | 201, 400    |
| GET    | `/api/bookings/:bid`                     | Devuelve una reserva por id                       | 200, 404    |
| POST   | `/api/bookings/:bid/services/:sid`       | Agrega un servicio a la reserva (o incrementa `quantity` si ya estaba) | 200, 404 |

`POST /api/bookings/:bid/services/:sid` valida primero que exista la reserva y después que exista el servicio; si falta cualquiera de los dos, responde `404` indicando cuál.

Si `POST /api/bookings` recibe servicios iniciales, cada uno debe referenciar un servicio existente (y `quantity` debe ser un entero >= 1); si no, responde `400`. Los repetidos se acumulan en `quantity`.

## Recurso `messages`

Modelo definido en `src/models/message.model.js` (`clientName`, `clientEmail`, `message`, con `createdAt` y `updatedAt` automáticos). Por ahora no expone endpoints: la consigna de esta etapa no los pide.

## Ejemplos

Crear un servicio:

```bash
curl -X POST http://localhost:8082/api/services \
  -H "Content-Type: application/json" \
  -d '{"name":"Tintura","description":"Coloración completa","duration":90,"price":9000,"category":"peluqueria","available":true}'
```

```
201
{ "id": "6702a1f4c3e1b2a9d8f01234", "name": "Tintura", "description": "Coloración completa", "duration": 90, "price": 9000, "category": "peluqueria", "available": true }
```

Crear una reserva vacía:

```bash
curl -X POST http://localhost:8082/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Ana Gómez","clientEmail":"ana@mail.com","date":"2026-10-10","time":"14:30"}'
```

```
201
{ "id": "6702a2b9c3e1b2a9d8f05678", "clientName": "Ana Gómez", "clientEmail": "ana@mail.com", "date": "2026-10-10", "time": "14:30", "status": "pendiente", "services": [] }
```

Agregar un servicio a esa reserva (y de nuevo, para ver cómo suma `quantity`), usando los ids devueltos arriba:

```bash
curl -X POST http://localhost:8082/api/bookings/6702a2b9c3e1b2a9d8f05678/services/6702a1f4c3e1b2a9d8f01234
curl -X POST http://localhost:8082/api/bookings/6702a2b9c3e1b2a9d8f05678/services/6702a1f4c3e1b2a9d8f01234
```

```
200
{ "...": "...", "services": [ { "service": "6702a1f4c3e1b2a9d8f01234", "quantity": 2 } ] }
```

Reserva o servicio inexistente:

```bash
curl -X POST http://localhost:8082/api/bookings/999/services/6702a1f4c3e1b2a9d8f01234
```

```
404
{ "error": "No existe una reserva con id 999" }
```

## Vistas con Handlebars

Express usa **Handlebars** (`express-handlebars`) como motor de vistas. Las vistas están en `src/views` y el layout común en `src/views/layouts/main.handlebars`.

| Ruta                      | Descripción                                                                                      |
|---------------------------|---------------------------------------------------------------------------------------------------|
| `GET /views/services`     | Tabla con todos los servicios de la base: nombre, descripción, duración, precio, categoría y disponibilidad. |
| `GET /views/availability` | Dos listados: servicios **disponibles** y **no disponibles**, con sus contadores.                |

Ninguna vista tiene datos escritos a mano: el controller de vistas (`views.controller.js`) llama a los **mismos services que la API REST** (`ServicesService`) y pasa el resultado a la plantilla, así que el flujo sigue siendo `route → controller → service → repository → DAO → model`. El controller de vistas no contiene lógica de negocio. Los archivos estáticos (CSS y JS del navegador) se sirven desde `src/public`.

## Tiempo real con Socket.io

Socket.io está configurado en `src/config/socket.config.js` y se inicia en `server.js` sobre el mismo servidor HTTP de Express. Cuando una acción real del sistema modifica un servicio, el controller de la API emite un evento a todos los navegadores conectados:

| Acción (API REST)            | Evento emitido    | Datos                    |
|------------------------------|-------------------|--------------------------|
| `POST /api/services`         | `service:created` | el servicio creado       |
| `PUT /api/services/:sid`     | `service:updated` | el servicio actualizado  |
| `DELETE /api/services/:sid`  | `service:deleted` | `{ id }` del eliminado   |

Los eventos solo se emiten cuando la operación se completó con éxito (una petición inválida no emite nada). El cliente (`src/public/js/socket.js`) escucha esos tres eventos y actualiza la página **sin recargarla**:

- En `/views/services` agrega, modifica o quita la fila correspondiente.
- En `/views/availability` mueve el servicio de una lista a la otra cuando cambia su disponibilidad y actualiza los contadores.
- En ambas muestra un aviso breve (por ejemplo, "Nuevo servicio: Corte").

**Cómo probarlo:** abrí `http://localhost:8082/views/availability` en el navegador, y desde Postman o `curl` cambiá la disponibilidad de un servicio:

```bash
curl -X PUT http://localhost:8082/api/services/<ID_DEL_SERVICIO> \
  -H "Content-Type: application/json" \
  -d '{"available": false}'
```

El servicio pasa de "Disponibles" a "No disponibles" en la página abierta, sin recargar.

## Arquitectura en capas

El flujo de cada request atraviesa cinco capas, cada una con una única responsabilidad:

```
router → controller → service → repository → DAO → MongoDB (Mongoose)
```

| Capa       | Responsabilidad                                                                                         |
|------------|----------------------------------------------------------------------------------------------------------|
| Router     | Define los endpoints y los conecta con su controller.                                                    |
| Controller | Lee `req`, llama al service y responde con `res`. Es la única capa que conoce `req` y `res`.              |
| Service    | Contiene las reglas de negocio (validaciones, filtros, verificación de existencia, incremento de `quantity`). No conoce `req`/`res` ni la base de datos. |
| Repository | Ofrece métodos de acceso a datos (`getAll`, `getById`, `create`, `update`, `delete`). Sin reglas de negocio; delega en el DAO. |
| DAO        | Consulta y escribe directamente en MongoDB mediante los modelos de Mongoose. Sin lógica de negocio.       |

Las vistas (`views.router.js` → `views.controller.js`) reutilizan los mismos services que la API REST, por lo que atraviesan las mismas capas.

### Funciones por capa

| Recurso    | Controller y service                                                                | Repository y DAO                          |
|------------|--------------------------------------------------------------------------------------|--------------------------------------------|
| `services` | `getServices`, `getServiceById`, `createService`, `updateService`, `deleteService`  | `getAll`, `getById`, `create`, `update`, `delete` |
| `bookings` | `createBooking`, `getBookingById`, `addServiceToBooking`                            | `create`, `getById`, `update`              |

### Migración de FileSystem a MongoDB

La migración reemplazó **solo la capa de persistencia**:

- **Cambiaron:** los DAO (ahora usan los modelos de Mongoose en vez de leer y escribir archivos JSON), se agregaron los modelos y la conexión a la base, y se eliminó la carpeta `src/data`.
- **No cambiaron:** routers, controllers, repositories y la lógica de `services.service.js`. Las URLs, los códigos de estado y el formato de las respuestas son los mismos; se verificó con la misma secuencia de requests antes y después de migrar.
- **Ajustes mínimos en `bookings.service.js`:** como ahora los servicios de una reserva son referencias `ObjectId`, el service compara por el id real del servicio y valida que los servicios iniciales existan.
- **Los DAO devuelven objetos planos** con `id` (string) en lugar de `_id`, así que ninguna capa superior conoce los detalles de Mongoose y la forma de las respuestas se mantiene.

### Regla de negocio clave

Si el mismo servicio se agrega dos veces a una reserva, no se duplica: se incrementa `quantity`. Esa lógica vive en `BookingsService.addServiceToBooking` (`bookings.service.js`), nunca en el DAO. El service también valida, en este orden, que exista la reserva y luego el servicio, y responde `404` indicando cuál falta.

### Manejo de errores

Los services lanzan un `HttpError` (`src/utils/httpError.js`) con el código correspondiente (`400` o `404`). Los controllers lo traducen a `res.status(...).json({ error })`; cualquier otro error inesperado responde `500`. Así los services no necesitan conocer `res`.

## Estructura

```
src/
  config/
    env.config.js              # Carga y valida variables de entorno (incluida MONGO_URI)
    db.config.js               # Conexión a MongoDB con Mongoose
    socket.config.js           # Configuración de Socket.io sobre el servidor HTTP
  models/
    service.model.js           # Esquema de services
    booking.model.js           # Esquema de bookings (services: [{ service: ObjectId, quantity }])
    message.model.js           # Esquema de messages
  controllers/
    services.controller.js     # API de services: lee req, llama al service, responde y emite eventos
    bookings.controller.js     # API de bookings
    views.controller.js        # Renderiza las vistas usando los services existentes
  services/
    services.service.js        # Reglas de negocio de services (validación, filtros, PUT parcial)
    bookings.service.js        # Reglas de negocio de bookings (existencia, quantity)
  repositories/
    services.repository.js     # Acceso a datos de services (delega en el DAO)
    bookings.repository.js
  dao/
    services.dao.js            # Consulta y escribe la colección services (Mongoose)
    bookings.dao.js            # Consulta y escribe la colección bookings (Mongoose)
  routes/
    services.router.js         # Endpoints de /api/services
    bookings.router.js         # Endpoints de /api/bookings
    views.router.js            # Endpoints de /views
  views/
    layouts/main.handlebars    # Layout común (navegación y scripts)
    services.handlebars        # Listado de servicios
    availability.handlebars    # Servicios disponibles / no disponibles
  public/
    css/styles.css             # Estilos de las vistas
    js/socket.js               # Cliente de Socket.io: actualiza la página al recibir eventos
  utils/
    httpError.js               # Error con código HTTP lanzado por los services
    mongo.js                   # Validación de ids y conversión de documentos a objetos planos
  app.js                       # Configura Express (Handlebars, estáticos, rutas, manejo de errores)
  server.js                    # Conecta a MongoDB y levanta el servidor HTTP con Socket.io
tests/
  helpers/db.js                # Conexión y limpieza de la base de tests
  services.test.js
  bookings.test.js
  views.test.js                # Vistas con datos reales de la base
  socket.test.js               # Eventos de Socket.io emitidos por acciones de la API
package.json
.env.example
.gitignore
README.md
```

## Notas

- El proyecto usa ESM (`import`/`export`), habilitado con `"type": "module"` en `package.json`.
- `.env` no se sube al repositorio (está en `.gitignore`); `.env.example` solo trae placeholders: la URI real con tus credenciales va únicamente en tu `.env` local.