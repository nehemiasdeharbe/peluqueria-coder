# Peluquería Coder - Sistema Backend de Turnos y Reservas

API REST con Node.js, Express y persistencia en FileSystem (archivos JSON) que gestiona dos recursos: `services` (servicios de la peluquería) y `bookings` (reservas de los clientes).

## Instalación

```bash
git clone https://github.com/nehemiasdeharbe/peluqueria-coder.git
cd peluqueria-coder
npm install
cp .env.example .env
```

`.env.example` ya trae valores de ejemplo funcionales (`PORT=8082`, `NODE_ENV=development`), así que se puede copiar tal cual.

## Ejecución

```bash
npm start
```

Modo desarrollo (reinicia al guardar cambios):

```bash
npm run dev
```

El servidor queda en `http://localhost:<PORT>`.

## Tests

```bash
npm test
```

Corre tests automatizados de las rutas con `node:test` y `supertest` (21 casos: servicios y reservas, incluyendo los códigos 200, 201, 400 y 404). Los tests respaldan `services.json` y `bookings.json` antes de correr y los restauran al terminar, así que no dejan datos de prueba en el repo.

## Variables de entorno

| Variable   | Descripción                         | Ejemplo       |
|------------|--------------------------------------|---------------|
| `PORT`     | Puerto en el que corre el servidor   | `8082`        |
| `NODE_ENV` | Entorno de ejecución                 | `development` |

Si falta alguna, la app no arranca y muestra un mensaje indicando cuál.

## Recurso `services`

```js
{
  id,          // number, generado automáticamente
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

### Validaciones

- `POST`: valida que estén los 6 campos y que `duration`/`price` sean números válidos (> 0 y >= 0 respectivamente) y `available` sea booleano.
- `PUT`: valida los mismos tipos, pero solo para los campos que se envíen (nunca exige todos). Nunca permite modificar el `id`, aunque se envíe en el body.

## Recurso `bookings`

```js
{
  id,          // number, generado automáticamente
  clientName,  // string
  clientEmail, // string, formato de email válido
  date,        // string
  time,        // string
  status,      // string, por defecto "pendiente"
  services: [{ service: idDelServicio, quantity: 1 }] // array, puede iniciar vacío
}
```

### Endpoints

| Método | Ruta                                   | Descripción                                      | Códigos     |
|--------|------------------------------------------|---------------------------------------------------|-------------|
| POST   | `/api/bookings`                          | Crea una reserva (`services` puede venir vacío)   | 201, 400    |
| GET    | `/api/bookings/:bid`                     | Devuelve una reserva por id                       | 200, 404    |
| POST   | `/api/bookings/:bid/services/:sid`       | Agrega un servicio a la reserva (o incrementa `quantity` si ya estaba) | 200, 404 |

`POST /api/bookings/:bid/services/:sid` valida primero que exista la reserva y después que exista el servicio; si falta cualquiera de los dos, responde `404` indicando cuál.

## Ejemplos

Crear un servicio:

```bash
curl -X POST http://localhost:8082/api/services \
  -H "Content-Type: application/json" \
  -d '{"name":"Tintura","description":"Coloración completa","duration":90,"price":9000,"category":"peluqueria","available":true}'
```

```
201
{ "id": 4, "name": "Tintura", "description": "Coloración completa", "duration": 90, "price": 9000, "category": "peluqueria", "available": true }
```

Crear una reserva vacía:

```bash
curl -X POST http://localhost:8082/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Ana Gómez","clientEmail":"ana@mail.com","date":"2026-10-10","time":"14:30"}'
```

```
201
{ "id": 1, "clientName": "Ana Gómez", "clientEmail": "ana@mail.com", "date": "2026-10-10", "time": "14:30", "status": "pendiente", "services": [] }
```

Agregar un servicio a esa reserva (y de nuevo, para ver cómo suma `quantity`):

```bash
curl -X POST http://localhost:8082/api/bookings/1/services/1
curl -X POST http://localhost:8082/api/bookings/1/services/1
```

```
200
{ "...": "...", "services": [ { "service": "1", "quantity": 2 } ] }
```

Reserva o servicio inexistente:

```bash
curl -X POST http://localhost:8082/api/bookings/999/services/1
```

```
404
{ "error": "No existe una reserva con id 999" }
```

## Arquitectura en capas

El flujo de cada request atraviesa cinco capas, cada una con una única responsabilidad:

```
router → controller → service → repository → DAO → archivo JSON
```

| Capa       | Responsabilidad                                                                                         |
|------------|----------------------------------------------------------------------------------------------------------|
| Router     | Define los endpoints y los conecta con su controller.                                                    |
| Controller | Lee `req`, llama al service y responde con `res`. Es la única capa que conoce `req` y `res`.              |
| Service    | Contiene las reglas de negocio (validaciones, filtros, verificación de existencia, incremento de `quantity`). No conoce `req`/`res` ni los archivos. |
| Repository | Ofrece métodos de acceso a datos (`getAll`, `getById`, `create`, `update`, `delete`). Sin reglas de negocio; delega en el DAO. |
| DAO        | Lee y escribe directamente en el archivo JSON. Sin lógica de negocio.                                    |

### Funciones por capa

| Recurso    | Controller y service                                                                | Repository y DAO                          |
|------------|--------------------------------------------------------------------------------------|--------------------------------------------|
| `services` | `getServices`, `getServiceById`, `createService`, `updateService`, `deleteService`  | `getAll`, `getById`, `create`, `update`, `delete` |
| `bookings` | `createBooking`, `getBookingById`, `addServiceToBooking`                            | `create`, `getById`, `update`              |

### Regla de negocio clave

Si el mismo servicio se agrega dos veces a una reserva, no se duplica: se incrementa `quantity`. Esa lógica vive en `BookingsService.addServiceToBooking` (`bookings.service.js`), nunca en el DAO. El service también valida, en este orden, que exista la reserva y luego el servicio, y responde `404` indicando cuál falta.

### Manejo de errores

Los services lanzan un `HttpError` (`src/utils/httpError.js`) con el código correspondiente (`400` o `404`). Los controllers lo traducen a `res.status(...).json({ error })`; cualquier otro error inesperado responde `500`. Así los services no necesitan conocer `res`.

### Por qué esta estructura

- Cada capa se puede leer, probar y cambiar de forma aislada.
- Cambiar la persistencia (por ejemplo, de archivos JSON a MongoDB con Mongoose) solo requiere reemplazar el DAO y, si hace falta, el repository: los services y controllers no se tocan.
- Los repositories reciben su DAO por constructor y los services su repository, lo que facilita reemplazarlos o simularlos en tests.

Esta pre-entrega es un refactor interno: las URLs, los códigos de estado y las respuestas de los endpoints **no cambiaron** (los 21 tests existentes pasan sin modificaciones).

## Estructura

```
src/
  config/
    env.config.js              # Carga y valida variables de entorno
  controllers/
    services.controller.js     # Lee req, llama al service y responde res
    bookings.controller.js
  services/
    services.service.js        # Reglas de negocio de services (validación, filtros, PUT parcial)
    bookings.service.js        # Reglas de negocio de bookings (existencia, quantity)
  repositories/
    services.repository.js     # Acceso a datos de services (delega en el DAO)
    bookings.repository.js
  dao/
    services.dao.js            # Lee y escribe services.json
    bookings.dao.js            # Lee y escribe bookings.json
  routes/
    services.router.js         # Define los endpoints de /api/services
    bookings.router.js         # Define los endpoints de /api/bookings
  data/
    services.json
    bookings.json
  utils/
    httpError.js               # Error con código HTTP lanzado por los services
  app.js                       # Configura Express (middlewares, rutas, manejo de errores)
  server.js                    # Levanta el servidor
tests/
  services.test.js
  bookings.test.js
package.json
.env.example
.gitignore
README.md
```

## Notas

- El proyecto usa ESM (`import`/`export`), habilitado con `"type": "module"` en `package.json`.
- `.env` no se sube al repositorio (está en `.gitignore`); `.env.example` trae valores reales listos para usar.