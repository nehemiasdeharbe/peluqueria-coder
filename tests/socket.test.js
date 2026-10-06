import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import supertest from 'supertest';
import { io as createClient } from 'socket.io-client';
import app from '../src/app.js';
import { initSocket } from '../src/config/socket.config.js';
import { setupTestDB, teardownTestDB } from './helpers/db.js';

const request = supertest(app);

let httpServer;
let io;
let client;

const waitForEvent = (event) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No llegó el evento "${event}"`)), 3000);
    client.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

before(async () => {
  await setupTestDB();

  httpServer = createServer(app);
  io = initSocket(httpServer, app);
  await new Promise((resolve) => httpServer.listen(0, resolve));

  const { port } = httpServer.address();
  client = createClient(`http://localhost:${port}`, { transports: ['websocket'] });
  await new Promise((resolve) => client.on('connect', resolve));
});

after(async () => {
  client.close();
  await io.close();
  await teardownTestDB();
});

const newService = {
  name: 'Servicio en vivo',
  description: 'Prueba de tiempo real',
  duration: 30,
  price: 2000,
  category: 'peluqueria',
  available: true,
};

test('POST /api/services emite service:created con el servicio creado', async () => {
  const eventPromise = waitForEvent('service:created');
  const res = await request.post('/api/services').send(newService);
  const payload = await eventPromise;

  assert.equal(res.status, 201);
  assert.equal(payload.id, res.body.id);
  assert.equal(payload.name, 'Servicio en vivo');
});

test('PUT /api/services/:sid emite service:updated cuando cambia la disponibilidad', async () => {
  const created = await request.post('/api/services').send(newService);

  const eventPromise = waitForEvent('service:updated');
  await request.put(`/api/services/${created.body.id}`).send({ available: false });
  const payload = await eventPromise;

  assert.equal(payload.id, created.body.id);
  assert.equal(payload.available, false);
});

test('DELETE /api/services/:sid emite service:deleted con el id', async () => {
  const created = await request.post('/api/services').send(newService);

  const eventPromise = waitForEvent('service:deleted');
  await request.delete(`/api/services/${created.body.id}`);
  const payload = await eventPromise;

  assert.deepEqual(payload, { id: created.body.id });
});

test('Una petición inválida no emite ningún evento', async () => {
  let received = false;
  const listener = () => { received = true; };
  client.on('service:created', listener);

  const res = await request.post('/api/services').send({ name: 'Incompleto' });
  await new Promise((resolve) => setTimeout(resolve, 300));
  client.off('service:created', listener);

  assert.equal(res.status, 400);
  assert.equal(received, false);
});