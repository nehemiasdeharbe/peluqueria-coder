# Peluquería Coder - Administrador de servicios

API en Node.js con ESM que implementa un administrador de servicios (`ServiceManager`) para un sistema de turnos y reservas de una peluquería, expuesto mediante rutas de Express.

## Descripción

La aplicación gestiona el recurso **services** (servicios ofrecidos por la peluquería: cortes, manicura, etc.): listarlos, buscarlos por id, crearlos, actualizarlos y eliminarlos. Los datos se persisten en un archivo JSON (`src/data/services.json`).

## Instalación

1. Cloná el repositorio:

   ```bash
   git clone https://github.com/<tu-usuario>/peluqueria-coder.git
   cd peluqueria-coder
   ```

2. Instalá las dependencias:

   ```bash
   npm install
   ```

3. Creá tu archivo `.env` a partir de `.env_example`:

   ```bash
   cp .env_example .env
   ```

   Completá los valores (ver sección de variables de entorno).

## Ejecución

```bash
node src/app.js
```

O, si agregaste el script en `package.json`:

```bash
npm start
```

Al iniciar, `src/config/env.config.js` valida que existan las variables de entorno requeridas. Si falta alguna, la aplicación no arranca y muestra un mensaje indicando cuáles faltan.

Una vez arriba, el servidor queda escuchando en `http://localhost:<PORT>`.

## Variables de entorno

| Variable    | Descripción                              | Ejemplo       |
|-------------|-------------------------------------------|---------------|
| `PORT`      | Puerto en el que corre la aplicación      | `8082`        |
| `NODE_ENV`  | Entorno de ejecución                      | `development` |

Se definen en un archivo `.env` (no incluido en el repositorio). Usar `.env_example` como plantilla.

## Recurso: `services`

Cada servicio tiene la siguiente forma:

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

## Endpoints (Express)

| Método | Ruta                  | Descripción                          |
|--------|------------------------|---------------------------------------|
| GET    | `/api/services`         | Devuelve todos los servicios          |
| GET    | `/api/services/:id`     | Devuelve un servicio por id           |
| POST   | `/api/services`         | Crea un nuevo servicio                |
| PUT    | `/api/services/:id`     | Actualiza un servicio existente       |
| DELETE | `/api/services/:id`     | Elimina un servicio                   |

## Uso de `ServiceManager`

```js
import ServiceManager from './src/managers/ServiceManager.js';

const serviceManager = new ServiceManager();

// Obtener todos los servicios
const services = await serviceManager.getServices();

// Obtener un servicio por id
const service = await serviceManager.getServiceById(1);
// -> devuelve el servicio o null si no existe

// Agregar un nuevo servicio (el id se genera automáticamente)
const newService = await serviceManager.addService({
  name: 'Depilación',
  description: 'Depilación con cera',
  duration: 40,
  price: 5000,
  category: 'estetica',
  available: true,
});
// -> lanza un error si falta algún campo requerido (name, description, duration, price, category, available)

// Actualizar un servicio existente (no se puede modificar el id)
const updated = await serviceManager.updateService(newService.id, {
  price: 5500,
});
// -> devuelve null si el servicio no existe

// Eliminar un servicio
const deleted = await serviceManager.deleteService(newService.id);
// -> devuelve null si el servicio no existe
```

## Estructura del proyecto

```
src/
  config/
    env.config.js      # Carga y valida variables de entorno
  managers/
    ServiceManager.js  # Lógica de negocio de los servicios
  data/
    services.json       # Persistencia de los servicios
  router/
    router.js           # Rutas de Express para /api/services
  app.js                # Punto de entrada, arranca el servidor
package.json
.env_example
.gitignore
README.md
```

## Notas

- El proyecto usa sintaxis ESM (`import`/`export`), habilitada con `"type": "module"` en `package.json`.
- El archivo `.env` **no** se sube al repositorio (está en `.gitignore`); usar `.env_example` como referencia.

AUTOR: Nehemias Deharbe