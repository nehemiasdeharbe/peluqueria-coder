# Peluquería Coder - Sistema Backend de Turnos y Reservas

API REST con Node.js, Express y persistencia en **MongoDB Atlas con Mongoose** que gestiona los recursos `services` (servicios de la peluquería) y `bookings` (reservas de los clientes). Incluye consultas avanzadas (filtros, paginación y ordenamiento), **validación de datos con Zod**, reservas que referencian servicios y se consultan con **`populate`**, el modelo `messages`, **vistas renderizadas en el servidor con Handlebars** y **actualizaciones en tiempo real con Socket.io**.

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

Corre tests automatizados con `node:test` y `supertest` (109 casos: servicios, consultas avanzadas, validaciones, reservas con `populate`, vistas y eventos de Socket.io, incluyendo los códigos 200, 201, 400 y 404). Los tests usan **siempre una base aparte llamada `peluqueria_test`** dentro del mismo cluster, aunque `MONGO_URI` apunte a otra, y vacían sus colecciones al empezar y al terminar. Así nunca tocan los datos reales de la aplicación. Los archivos de tests corren en serie porque comparten esa base.

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

| Método | Ruta                    | Descripción                                                    | Códigos       |
|--------|-------------------------|-----------------------------------------------------------------|---------------|
| GET    | `/api/services`         | Lista servicios con filtros, paginación y ordenamiento          | 200, 400      |
| GET    | `/api/services/:sid`    | Devuelve un servicio por id                                     | 200, 404      |
| POST   | `/api/services`         | Crea un servicio (el id se genera solo)                         | 201, 400      |
| PUT    | `/api/services/:sid`    | Actualiza un servicio                                           | 200, 400, 404 |
| DELETE | `/api/services/:sid`    | Elimina un servicio                                             | 200, 404      |

**Sobre `PUT`:** la implementación hace un **merge parcial**: solo pisa los campos que vengan en el body, el resto del servicio se conserva tal cual estaba. En términos estrictos de REST esto es más parecido a la semántica de `PATCH` que a la de `PUT` (que reemplazaría el recurso entero). Se documenta acá a propósito: se mantiene `PUT` por ser la ruta pedida en la consigna, pero el comportamiento es el de una actualización parcial.

**Ids inexistentes:** `GET`, `PUT` y `DELETE` sobre `/api/services/:sid`, y `GET /api/bookings/:bid`, responden `404` cuando el id no existe, incluso si no tiene formato de ObjectId (por ejemplo `99999` o `abc`).

## Consultas avanzadas: `GET /api/services`

Acepta estos query params, todos opcionales:

| Parámetro   | Valores                                      | Por defecto | Descripción                                                              |
|-------------|-----------------------------------------------|-------------|---------------------------------------------------------------------------|
| `category`  | texto                                         | -           | Filtra por categoría (sin distinguir mayúsculas, texto exacto)            |
| `available` | `true` o `false`                              | -           | Filtra por disponibilidad                                                 |
| `page`      | entero >= 1                                   | `1`         | Página a devolver                                                         |
| `limit`     | entero entre 1 y 100                          | `10`        | Cantidad de servicios por página                                          |
| `sortBy`    | `name`, `price`, `duration` o `category`      | orden de alta | Campo por el que se ordena                                              |
| `order`     | `asc` o `desc`                                | `asc`       | Sentido del orden (solo se aplica si se envía `sortBy`)                   |

Los parámetros se pueden combinar, y los que no existen se ignoran. Un valor inválido responde `400` (ver "Validaciones").

### Respuesta

```json
{
  "services": [
    {
      "id": "6ac55d7c9aa027217ec639dd",
      "name": "Corte degradé",
      "description": "Degradé y perfilado",
      "duration": 45,
      "price": 4500,
      "category": "peluqueria",
      "available": true
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 1,
  "totalPages": 2,
  "hasPrevPage": false,
  "hasNextPage": true
}
```

| Campo         | Descripción                                                          |
|---------------|-----------------------------------------------------------------------|
| `services`    | Servicios de la página pedida                                         |
| `total`       | Total de servicios que cumplen el filtro (no solo los de la página)   |
| `page`        | Página actual                                                         |
| `limit`       | Servicios por página                                                  |
| `totalPages`  | Total de páginas (`ceil(total / limit)`)                              |
| `hasPrevPage` | `true` si existe una página anterior                                  |
| `hasNextPage` | `true` si existe una página siguiente                                 |

Si se pide una página fuera de rango, se devuelve `services: []` con los metadatos correspondientes.

### Ejemplos

```bash
# Primera página con 10 servicios (valores por defecto)
curl "http://localhost:8082/api/services"

# Paginación: tercera página de 5 servicios
curl "http://localhost:8082/api/services?page=3&limit=5"

# Filtros: servicios de la categoría "corte" que están disponibles
curl "http://localhost:8082/api/services?category=corte&available=true"

# Ordenamiento: del más caro al más barato
curl "http://localhost:8082/api/services?sortBy=price&order=desc"

# Todo junto: los 5 más baratos de "color" que están disponibles
curl "http://localhost:8082/api/services?category=color&available=true&sortBy=price&order=asc&limit=5"
```

**Nota:** el ordenamiento por `name` y `category` usa el orden de MongoDB, que distingue mayúsculas de minúsculas (las mayúsculas van antes que las minúsculas).

> **Cambio respecto de la versión anterior:** `GET /api/services` antes devolvía directamente un array; ahora devuelve un objeto con el listado en `services` y los metadatos de paginación. Las vistas (`/views/services` y `/views/availability`) siguen mostrando todos los servicios, sin paginar.

## Validaciones con Zod

Los datos se validan **antes de llegar al controller, al service y a MongoDB**, con un middleware (`src/middlewares/validate.middleware.js`) que aplica un schema de Zod (`src/schemas`). Las rutas solo declaran qué schema usa cada endpoint:

```js
router.post('/', validate({ body: createServiceSchema }), createService);
```

Si los datos son válidos, el middleware deja la versión ya limpia en `req.validated` (sin campos de más, con los valores por defecto aplicados y los tipos convertidos). Si no, corta el flujo y responde `400`. Los modelos de Mongoose conservan sus propias validaciones, pero solo como última defensa: no se depende de ellas.

| Endpoint                                  | Schema                       | Qué valida                                                                                                   |
|-------------------------------------------|------------------------------|---------------------------------------------------------------------------------------------------------------|
| `POST /api/services`                      | `createServiceSchema`        | Los 6 campos son obligatorios: `name`, `description`, `category` (texto no vacío), `duration` (número > 0), `price` (número >= 0), `available` (booleano). Se descartan los campos que no pertenecen al servicio, como `id`. |
| `PUT /api/services/:sid`                  | `updateServiceSchema`        | Los mismos campos, pero todos opcionales. Solo se validan los que se envían. El `id` nunca se modifica.       |
| `GET /api/services`                       | `listServicesQuerySchema`    | `page`, `limit`, `sortBy`, `order`, `available`, `category` (ver tabla de consultas avanzadas).               |
| `POST /api/bookings`                      | `createBookingSchema`        | `clientName` (texto), `clientEmail` (email), `date` (`YYYY-MM-DD`, fecha real), `time` (`HH:mm`, 24 hs), `status` (texto, opcional), `services` (array opcional de `{ service, quantity }` con `service` ObjectId y `quantity` entero >= 1). |
| `POST /api/bookings/:bid/services/:sid`   | `addServiceToBookingSchema`  | `bid` y `sid` deben ser ObjectId válidos (24 caracteres hexadecimales).                                       |

### Formato de los errores

Los datos inválidos responden `400` con un mensaje legible en `error` y el detalle por campo en `details`. Se informan **todos** los errores juntos, no solo el primero:

```bash
curl -X POST http://localhost:8082/api/services \
  -H "Content-Type: application/json" \
  -d '{"name":"","price":-5,"available":"si"}'
```

```json
{
  "error": "Datos inválidos: El campo \"name\" no puede estar vacío; Falta el campo requerido: description; Falta el campo requerido: duration; El campo \"price\" debe ser un número mayor o igual a 0; Falta el campo requerido: category; El campo \"available\" debe ser true o false",
  "details": [
    { "field": "name", "message": "El campo \"name\" no puede estar vacío" },
    { "field": "description", "message": "Falta el campo requerido: description" },
    { "field": "duration", "message": "Falta el campo requerido: duration" },
    { "field": "price", "message": "El campo \"price\" debe ser un número mayor o igual a 0" },
    { "field": "category", "message": "Falta el campo requerido: category" },
    { "field": "available", "message": "El campo \"available\" debe ser true o false" }
  ]
}
```

Lo mismo vale para los parámetros de consulta:

```bash
curl "http://localhost:8082/api/services?page=0&sortBy=password"
```

```json
{
  "error": "Datos inválidos: El parámetro \"page\" debe ser un número entero mayor o igual a 1; El parámetro \"sortBy\" debe ser uno de: name, price, duration, category",
  "details": [
    { "field": "page", "message": "El parámetro \"page\" debe ser un número entero mayor o igual a 1" },
    { "field": "sortBy", "message": "El parámetro \"sortBy\" debe ser uno de: name, price, duration, category" }
  ]
}
```

Un body que no es un JSON válido también responde `400` (`El body no es un JSON válido`).

## Recurso `bookings`

```js
{
  id,          // string (ObjectId de MongoDB), generado automáticamente
  clientName,  // string
  clientEmail, // string, formato de email válido
  date,        // string, YYYY-MM-DD
  time,        // string, HH:mm
  status,      // string, por defecto "pendiente"
  services: [{ service: ObjectId, quantity: 1 }] // referencia al servicio por id; puede iniciar vacío
}
```

Los servicios de una reserva se guardan **como referencia (`ObjectId`)** al documento de la colección `services`, nunca como una copia del servicio: en la base cada ítem tiene solo `service` y `quantity`.

### Endpoints

| Método | Ruta                                   | Descripción                                                              | Códigos       |
|--------|------------------------------------------|---------------------------------------------------------------------------|---------------|
| POST   | `/api/bookings`                          | Crea una reserva (`services` puede venir vacío)                           | 201, 400      |
| GET    | `/api/bookings/:bid`                     | Devuelve una reserva con los datos completos de sus servicios (`populate`) | 200, 404      |
| POST   | `/api/bookings/:bid/services/:sid`       | Agrega un servicio a la reserva (o incrementa `quantity` si ya estaba)    | 200, 400, 404 |

`POST /api/bookings/:bid/services/:sid` valida primero el formato de los ids (`400`), después que exista la reserva y por último que exista el servicio (`404` indicando cuál falta). Su respuesta devuelve la reserva con los servicios como referencias (`service` es un id).

Si `POST /api/bookings` recibe servicios iniciales, cada uno debe referenciar un servicio existente; si no, responde `400`. Los repetidos se acumulan en `quantity`.

### Consultar una reserva con sus servicios completos

`GET /api/bookings/:bid` usa `populate` para reemplazar cada referencia por el servicio completo, junto con los datos de la reserva (cliente, email, fecha, hora y estado). `populate` solo se usa para consultar: no modifica lo que está guardado.

```bash
# 1. Crear una reserva
curl -X POST http://localhost:8082/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Ana Gómez","clientEmail":"ana@mail.com","date":"2026-10-10","time":"14:30"}'

# 2. Agregarle un servicio dos veces (usando los ids devueltos)
curl -X POST http://localhost:8082/api/bookings/<BID>/services/<SID>
curl -X POST http://localhost:8082/api/bookings/<BID>/services/<SID>

# 3. Consultarla con los servicios completos
curl http://localhost:8082/api/bookings/<BID>
```

```json
{
  "id": "6ac55d7c9aa027217ec639e0",
  "clientName": "Ana Gómez",
  "clientEmail": "ana@mail.com",
  "date": "2026-10-10",
  "time": "14:30",
  "status": "pendiente",
  "services": [
    {
      "service": {
        "id": "6ac55d7c9aa027217ec639dc",
        "name": "Corte clásico",
        "description": "Corte de pelo clásico",
        "duration": 30,
        "price": 4000,
        "category": "peluqueria",
        "available": true
      },
      "quantity": 2
    }
  ]
}
```

Si un servicio se elimina después de haberse agregado a una reserva, esa reserva conserva la referencia y `populate` devuelve `"service": null` en ese ítem.

## Recurso `messages`

Modelo definido en `src/models/message.model.js` (`clientName`, `clientEmail`, `message`, con `createdAt` y `updatedAt` automáticos). Por ahora no expone endpoints: la consigna no los pide.

## Vistas con Handlebars

Express usa **Handlebars** (`express-handlebars`) como motor de vistas. Las vistas están en `src/views` y el layout común en `src/views/layouts/main.handlebars`.

| Ruta                      | Descripción                                                                                      |
|---------------------------|---------------------------------------------------------------------------------------------------|
| `GET /views/services`     | Tabla con todos los servicios de la base: nombre, descripción, duración, precio, categoría y disponibilidad. |
| `GET /views/availability` | Dos listados: servicios **disponibles** y **no disponibles**, con sus contadores.                |

Ninguna vista tiene datos escritos a mano: el controller de vistas (`views.controller.js`) llama al **mismo `ServicesService` que la API REST** y pasa el resultado a la plantilla, así que el flujo sigue siendo `route → controller → service → repository → DAO → model`. El controller de vistas no contiene lógica de negocio. Los archivos estáticos (CSS y JS del navegador) se sirven desde `src/public`.

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

El flujo de cada request atraviesa estas capas, cada una con una única responsabilidad:

```
router → [middleware de validación] → controller → service → repository → DAO → MongoDB (Mongoose)
```

| Capa       | Responsabilidad                                                                                         |
|------------|----------------------------------------------------------------------------------------------------------|
| Router     | Define los endpoints, declara qué schema valida cada uno y los conecta con su controller. Sin lógica.     |
| Middleware de validación | Valida `params`, `query` y `body` con Zod antes de continuar. Si hay errores, responde `400`.  |
| Controller | Lee los datos ya validados, llama al service y responde con `res`. Es la única capa que conoce `req` y `res`. |
| Service    | Contiene las reglas de negocio (existencia de reservas y servicios, incremento de `quantity`, armado de la paginación). No conoce `req`/`res` ni la base de datos. |
| Repository | Ofrece métodos de acceso a datos. Sin reglas de negocio; delega en el DAO.                               |
| DAO        | Consulta y escribe directamente en MongoDB mediante los modelos de Mongoose: arma los filtros, el orden y el `populate`. Sin lógica de negocio. |

Las vistas (`views.router.js` → `views.controller.js`) reutilizan el mismo `ServicesService`, por lo que atraviesan las mismas capas.

### Funciones por capa

| Recurso    | Controller y service                                                                              | Repository y DAO                                                  |
|------------|----------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
| `services` | `getServices`, `getServiceById`, `createService`, `updateService`, `deleteService` (+ `listServices` para las vistas) | `getAll`, `findPaginated`, `getById`, `create`, `update`, `delete` |
| `bookings` | `createBooking`, `getBookingById`, `addServiceToBooking`                                          | `create`, `getById`, `getByIdWithServices`, `update`               |

### Regla de negocio clave

Si el mismo servicio se agrega dos veces a una reserva, no se duplica: se incrementa `quantity`. Esa lógica vive en `BookingsService.addServiceToBooking` (`bookings.service.js`), nunca en el DAO.

### Manejo de errores

Los datos inválidos los corta el middleware de validación con `400`. Los services lanzan un `HttpError` (`src/utils/httpError.js`) para las reglas de negocio (`404` si no existe un recurso, `400` si una reserva referencia un servicio inexistente). Los controllers lo traducen a `res.status(...).json({ error })`; cualquier otro error inesperado responde `500`.

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
  schemas/
    shared.js                  # Piezas reutilizables de Zod (texto, número, ObjectId, enteros de query)
    service.schema.js          # Schemas de services: crear, actualizar y consulta del listado
    booking.schema.js          # Schemas de bookings: crear reserva y agregar servicio a una reserva
  middlewares/
    validate.middleware.js     # Aplica un schema de Zod a params, query y body y responde 400 si falla
  controllers/
    services.controller.js     # API de services: llama al service, responde y emite eventos
    bookings.controller.js     # API de bookings
    views.controller.js        # Renderiza las vistas usando los services existentes
  services/
    services.service.js        # Reglas de negocio de services (paginación, existencia)
    bookings.service.js        # Reglas de negocio de bookings (existencia, quantity, populate)
  repositories/
    services.repository.js     # Acceso a datos de services (delega en el DAO)
    bookings.repository.js
  dao/
    services.dao.js            # Consulta y escribe la colección services (filtros, orden, paginación)
    bookings.dao.js            # Consulta y escribe la colección bookings (incluye populate)
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
    mongo.js                   # Validación de ids, conversión de documentos y escape de regex
  app.js                       # Configura Express (Handlebars, estáticos, rutas, manejo de errores)
  server.js                    # Conecta a MongoDB y levanta el servidor HTTP con Socket.io
tests/
  helpers/db.js                # Conexión y limpieza de la base de tests
  services.test.js             # CRUD de services
  services.query.test.js       # Filtros, paginación y ordenamiento
  validation.test.js           # Validaciones con Zod
  bookings.test.js             # Reservas, referencias y populate
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