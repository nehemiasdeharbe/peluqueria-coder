import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB } from './helpers/db.js';

const request = supertest(app);
let existingServiceId;

before(async () => {
  await setupTestDB();

  const res = await request.post('/api/services').send({
    name: 'Corte de pelo',
    description: 'Corte clásico',
    duration: 30,
    price: 3000,
    category: 'peluqueria',
    available: true,
  });
  existingServiceId = res.body.id;
});

after(async () => {
  await teardownTestDB();
});

test('POST /api/bookings crea una reserva con services vacío (201)', async () => {
  const res = await request.post('/api/bookings').send({
    clientName: 'Ana Gómez',
    clientEmail: 'ana@mail.com',
    date: '2026-10-10',
    time: '14:30',
  });

  assert.equal(res.status, 201);
  assert.ok(res.body.id);
  assert.deepEqual(res.body.services, []);
  assert.equal(res.body.status, 'pendiente');
});

test('POST /api/bookings con campos faltantes devuelve 400', async () => {
  const res = await request.post('/api/bookings').send({ clientName: 'Sin datos' });
  assert.equal(res.status, 400);
});

test('POST /api/bookings con email inválido devuelve 400', async () => {
  const res = await request.post('/api/bookings').send({
    clientName: 'Luis Pérez',
    clientEmail: 'no-es-un-email',
    date: '2026-10-10',
    time: '10:00',
  });
  assert.equal(res.status, 400);
});

test('GET /api/bookings/:bid devuelve 200 si existe', async () => {
  const createRes = await request.post('/api/bookings').send({
    clientName: 'Carla Ruiz',
    clientEmail: 'carla@mail.com',
    date: '2026-11-01',
    time: '09:00',
  });

  const getRes = await request.get(`/api/bookings/${createRes.body.id}`);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.clientName, 'Carla Ruiz');
});

test('GET /api/bookings/:bid con id inexistente devuelve 404', async () => {
  const res = await request.get('/api/bookings/99999');
  assert.equal(res.status, 404);
});

test('POST /api/bookings/:bid/services/:sid agrega un servicio nuevo', async () => {
  const createRes = await request.post('/api/bookings').send({
    clientName: 'Marco Díaz',
    clientEmail: 'marco@mail.com',
    date: '2026-11-05',
    time: '16:00',
  });
  const bookingId = createRes.body.id;

  const addRes = await request.post(`/api/bookings/${bookingId}/services/${existingServiceId}`);
  assert.equal(addRes.status, 200);

  const entry = addRes.body.services.find((s) => String(s.service) === String(existingServiceId));
  assert.ok(entry);
  assert.equal(entry.quantity, 1);
});

test('POST /api/bookings/:bid/services/:sid repetido incrementa quantity', async () => {
  const createRes = await request.post('/api/bookings').send({
    clientName: 'Sofía López',
    clientEmail: 'sofia@mail.com',
    date: '2026-11-06',
    time: '11:00',
  });
  const bookingId = createRes.body.id;

  await request.post(`/api/bookings/${bookingId}/services/${existingServiceId}`);
  const secondRes = await request.post(`/api/bookings/${bookingId}/services/${existingServiceId}`);

  const entry = secondRes.body.services.find((s) => String(s.service) === String(existingServiceId));
  assert.equal(entry.quantity, 2);
});

test('POST /api/bookings/:bid/services/:sid con booking inexistente devuelve 404', async () => {
  const res = await request.post(`/api/bookings/99999/services/${existingServiceId}`);
  assert.equal(res.status, 404);
});

test('POST /api/bookings/:bid/services/:sid con servicio inexistente devuelve 404', async () => {
  const createRes = await request.post('/api/bookings').send({
    clientName: 'Pedro Vega',
    clientEmail: 'pedro@mail.com',
    date: '2026-11-07',
    time: '18:00',
  });

  const res = await request.post(`/api/bookings/${createRes.body.id}/services/99999`);
  assert.equal(res.status, 404);
});

test('POST /api/bookings con un servicio inicial lo guarda como referencia', async () => {
  const res = await request.post('/api/bookings').send({
    clientName: 'Julia Sosa',
    clientEmail: 'julia@mail.com',
    date: '2026-12-01',
    time: '10:00',
    services: [{ service: existingServiceId, quantity: 2 }],
  });

  assert.equal(res.status, 201);
  assert.deepEqual(res.body.services, [{ service: existingServiceId, quantity: 2 }]);
});

test('POST /api/bookings con un servicio inicial inexistente devuelve 400', async () => {
  const res = await request.post('/api/bookings').send({
    clientName: 'Hugo Paz',
    clientEmail: 'hugo@mail.com',
    date: '2026-12-02',
    time: '12:00',
    services: [{ service: '99999', quantity: 1 }],
  });

  assert.equal(res.status, 400);
});