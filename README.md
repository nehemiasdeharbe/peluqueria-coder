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
 200         |
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

## Estructura

```
src/
  config/
    env.config.js            # Carga y valida variables de entorno
  controllers/
    services.controller.js   # Lee req y responde res; usa ServiceManager
    bookings.controller.js   # Lee req y responde res; usa BookingManager y ServiceManager
  managers/
    ServiceManager.js        # Lógica de datos de services (CRUD, filtros, validación)
    BookingManager.js        # Lógica de datos de bookings (crear, buscar, agregar servicio)
  data/
    services.json            # Persistencia de services
    bookings.json            # Persistencia de bookings
  routes/
    services.router.js       # Define los endpoints de /api/services y los conecta al controller
    bookings.router.js       # Define los endpoints de /api/bookings y los conecta al controller
  app.js                     # Configura Express (middlewares, rutas, manejo de errores)
  server.js                  # Levanta el servidor
tests/
  services.test.js           # Tests de rutas de services
  bookings.test.js           # Tests de rutas de bookings
package.json
.env.example
.gitignore
README.md
```

## Notas

- El proyecto usa ESM (`import`/`export`), habilitado con `"type": "module"` en `package.json`.
- `.env` no se sube al repositorio (está en `.gitignore`); `.env.example` trae valores reales listos para usar.
- La API está organizada en tres capas: **routes** (solo definen endpoints), **controllers** (leen `req.params`, `req.query` y `req.body`, llaman al manager y responden con `res.status().json()`) y **managers** (lógica de datos sobre los JSON, sin usar `req` ni `res`).
- `BookingManager` no importa `ServiceManager`: la validación de que un servicio exista antes de agregarlo a una reserva se hace en `bookings.controller.js`, para mantener cada manager enfocado en su propio recurso.