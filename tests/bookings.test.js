import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB } from './helpers/db.js';

const request = supertest(app);
let existingServiceId;
const NONEXISTENT_ID = '507f1f77bcf86cd799439011';

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
  const res = await request.post(`/api/bookings/${NONEXISTENT_ID}/services/${existingServiceId}`);
  assert.equal(res.status, 404);
});

test('POST /api/bookings/:bid/services/:sid con servicio inexistente devuelve 404', async () => {
  const createRes = await request.post('/api/bookings').send({
    clientName: 'Pedro Vega',
    clientEmail: 'pedro@mail.com',
    date: '2026-11-07',
    time: '18:00',
  });

  const res = await request.post(`/api/bookings/${createRes.body.id}/services/${NONEXISTENT_ID}`);
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

test('POST /api/bookings con un servicio inicial de id válido pero inexistente devuelve 400', async () => {
  const res = await request.post('/api/bookings').send({
    clientName: 'Rita Gómez',
    clientEmail: 'rita@mail.com',
    date: '2026-12-03',
    time: '13:00',
    services: [{ service: NONEXISTENT_ID, quantity: 1 }],
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /no existe un servicio/);
});

test('GET /api/bookings/:bid devuelve los servicios completos con populate', async () => {
  const createRes = await request.post('/api/bookings').send({
    clientName: 'Laura Mena',
    clientEmail: 'laura@mail.com',
    date: '2026-12-10',
    time: '15:30',
  });
  const bookingId = createRes.body.id;

  await request.post(`/api/bookings/${bookingId}/services/${existingServiceId}`);
  await request.post(`/api/bookings/${bookingId}/services/${existingServiceId}`);

  const res = await request.get(`/api/bookings/${bookingId}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.id, bookingId);
  assert.equal(res.body.clientName, 'Laura Mena');
  assert.equal(res.body.clientEmail, 'laura@mail.com');
  assert.equal(res.body.date, '2026-12-10');
  assert.equal(res.body.time, '15:30');
  assert.equal(res.body.status, 'pendiente');
  assert.equal(res.body.services.length, 1);
  assert.equal(res.body.services[0].quantity, 2);
  assert.deepEqual(res.body.services[0].service, {
    id: existingServiceId,
    name: 'Corte de pelo',
    description: 'Corte clásico',
    duration: 30,
    price: 3000,
    category: 'peluqueria',
    available: true,
  });
});

test('La reserva guarda solo la referencia (ObjectId) al servicio, no el servicio completo', async () => {
  const createRes = await request.post('/api/bookings').send({
    clientName: 'Mario Gil',
    clientEmail: 'mario@mail.com',
    date: '2026-12-11',
    time: '09:00',
  });
  await request.post(`/api/bookings/${createRes.body.id}/services/${existingServiceId}`);
  await request.get(`/api/bookings/${createRes.body.id}`); // el populate no debe persistir nada

  const stored = await mongoose.connection
    .collection('bookings')
    .findOne({ _id: new mongoose.Types.ObjectId(createRes.body.id) });

  assert.equal(stored.services.length, 1);
  assert.equal(stored.services[0].service.constructor.name, 'ObjectId');
  assert.deepEqual(Object.keys(stored.services[0]).sort(), ['quantity', 'service']);
});

test('GET /api/bookings/:bid con un servicio eliminado devuelve service: null en ese ítem', async () => {
  const serviceRes = await request.post('/api/services').send({
    name: 'Servicio efímero',
    description: 'Se va a borrar',
    duration: 10,
    price: 100,
    category: 'peluqueria',
    available: true,
  });
  const bookingRes = await request.post('/api/bookings').send({
    clientName: 'Eva Roca',
    clientEmail: 'eva@mail.com',
    date: '2026-12-12',
    time: '10:00',
    services: [{ service: serviceRes.body.id, quantity: 3 }],
  });
  await request.delete(`/api/services/${serviceRes.body.id}`);

  const res = await request.get(`/api/bookings/${bookingRes.body.id}`);

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.services, [{ service: null, quantity: 3 }]);
});