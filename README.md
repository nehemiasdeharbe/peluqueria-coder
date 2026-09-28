# Peluquería Coder - API REST de servicios

API REST con Node.js, Express y ESM para gestionar el recurso `services` del Sistema Backend de Turnos y Reservas de una peluquería. Las rutas se conectan con la clase `ServiceManager`, que guarda los datos en un archivo JSON.

## Instalación

```bash
git clone https://github.com/nehemiasdeharbe/peluqueria-coder.git
cd peluqueria-coder
npm install
cp .env.example .env
```

Completá los valores del `.env` (ver sección siguiente).

## Ejecución

```bash
npm start
```

Modo desarrollo (reinicia al guardar cambios):

```bash
npm run dev
```

El servidor queda en `http://localhost:<PORT>`.

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
  duration,    // number, en minutos
  price,       // number
  category,    // string
  available    // boolean
}
```

## Endpoints

| Método | Ruta                    | Descripción                                  | Códigos          |
|--------|-------------------------|-----------------------------------------------|------------------|
| GET    | `/api/services`         | Lista los servicios (acepta filtros)          | 200, 400         |
| GET    | `/api/services/:sid`    | Devuelve un servicio por id                   | 200, 404         |
| POST   | `/api/services`         | Crea un servicio (el id se genera solo)       | 201, 400         |
| PUT    | `/api/services/:sid`    | Actualiza un servicio (el id no se modifica)  | 200, 404         |
| DELETE | `/api/services/:sid`    | Elimina un servicio                           | 200, 404         |

### Filtros (query params) en `GET /api/services`

- `category`: filtra por categoría. Ej: `/api/services?category=estetica`
- `available`: `true` o `false`. Ej: `/api/services?available=true`
- Se pueden combinar: `/api/services?category=peluqueria&available=true`

Si `available` tiene un valor distinto de `true` o `false`, responde `400`.

## Ejemplos

Crear un servicio (no se envía `id`):

```bash
curl -X POST http://localhost:8082/api/services \
  -H "Content-Type: application/json" \
  -d '{"name":"Tintura","description":"Coloración completa","duration":90,"price":9000,"category":"peluqueria","available":true}'
```

Respuesta `201`:

```json
{
  "id": 4,
  "name": "Tintura",
  "description": "Coloración completa",
  "duration": 90,
  "price": 9000,
  "category": "peluqueria",
  "available": true
}
```

Si faltan campos, responde `400`:

```json
{ "error": "No se pudo crear el servicio, faltan campos requeridos: description, duration, price, category, available" }
```

Actualizar un servicio:

```bash
curl -X PUT http://localhost:8082/api/services/1 \
  -H "Content-Type: application/json" \
  -d '{"price":4200}'
```

Eliminar un servicio:

```bash
curl -X DELETE http://localhost:8082/api/services/4
```

## Estructura

```
src/
  config/
    env.config.js          # Carga y valida variables de entorno
  managers/
    ServiceManager.js      # Lógica de negocio (CRUD y filtros)
  data/
    services.json          # Persistencia
  routes/
    services.router.js     # Endpoints de /api/services
  app.js                   # Configura Express (middlewares y rutas)
  server.js                # Levanta el servidor
package.json
.env.example
.gitignore
README.md
