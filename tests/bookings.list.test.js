import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB } from './helpers/db.js';

const request = supertest(app);

let corteId;
let tinturaId;

const person = (n) => ({ clientName: `Cliente ${n}`, clientEmail: `cliente${n}@mail.com` });

before(async () => {
  await setupTestDB();

  const base = { description: 'd', duration: 30, price: 1000, category: 'peluqueria', available: true };
  corteId = (await request.post('/api/services').send({ ...base, name: 'Corte' })).body.id;
  tinturaId = (await request.post('/api/services').send({ ...base, name: 'Tintura', price: 9000 })).body.id;

  await request.post('/api/bookings').send({
    ...person(1), date: '2026-11-05', time: '10:00', status: 'pendiente',
    services: [{ service: corteId, quantity: 2 }],
  });
  await request.post('/api/bookings').send({
    ...person(2), date: '2026-11-01', time: '15:00', status: 'confirmada',
    services: [{ service: corteId }, { service: tinturaId }],
  });
  await request.post('/api/bookings').send({
    ...person(3), date: '2026-11-01', time: '09:30', status: 'pendiente',
  });
  await request.post('/api/bookings').send({
    ...person(4), date: '2026-12-01', time: '08:00', status: 'cancelada',
  });
});

after(async () => {
  await teardownTestDB();
});

const names = (res) => res.body.bookings.map((b) => b.clientName);

test('GET /api/bookings devuelve las reservas en orden de agenda con los metadatos de paginación', async () => {
  const res = await request.get('/api/bookings');

  assert.equal(res.status, 200);
  assert.deepEqual(names(res), ['Cliente 3', 'Cliente 2', 'Cliente 1', 'Cliente 4']);
  assert.equal(res.body.total, 4);
  assert.equal(res.body.page, 1);
  assert.equal(res.body.limit, 10);
  assert.equal(res.body.totalPages, 1);
  assert.equal(res.body.hasPrevPage, false);
  assert.equal(res.body.hasNextPage, false);
});

test('GET /api/bookings devuelve los servicios completos (populate) en cada reserva', async () => {
  const res = await request.get('/api/bookings');
  const second = res.body.bookings.find((b) => b.clientName === 'Cliente 2');

  assert.equal(second.services.length, 2);
  assert.deepEqual(second.services.map((s) => s.service.name).sort(), ['Corte', 'Tintura']);
  assert.ok(second.services.every((s) => s.quantity === 1));
  assert.deepEqual(Object.keys(second.services[0].service).sort(), [
    'available', 'category', 'description', 'duration', 'id', 'name', 'price',
  ]);

  const first = res.body.bookings.find((b) => b.clientName === 'Cliente 1');
  assert.equal(first.services[0].quantity, 2);
  assert.equal(first.services[0].service.id, corteId);
});

test('GET /api/bookings pagina el listado', async () => {
  const page1 = await request.get('/api/bookings?limit=3');
  const page2 = await request.get('/api/bookings?limit=3&page=2');

  assert.deepEqual(names(page1), ['Cliente 3', 'Cliente 2', 'Cliente 1']);
  assert.equal(page1.body.totalPages, 2);
  assert.equal(page1.body.hasNextPage, true);
  assert.deepEqual(names(page2), ['Cliente 4']);
  assert.equal(page2.body.hasPrevPage, true);
  assert.equal(page2.body.hasNextPage, false);
});

test('GET /api/bookings?status= filtra sin distinguir mayúsculas', async () => {
  const res = await request.get('/api/bookings?status=PENDIENTE');

  assert.deepEqual(names(res), ['Cliente 3', 'Cliente 1']);
  assert.equal(res.body.total, 2);
});

test('GET /api/bookings?status= sin coincidencias devuelve lista vacía', async () => {
  const res = await request.get('/api/bookings?status=inexistente');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.bookings, []);
  assert.equal(res.body.total, 0);
  assert.equal(res.body.totalPages, 0);
});

for (const query of ['page=0', 'page=abc', 'limit=0', 'limit=101', 'status=']) {
  test(`GET /api/bookings?${query} devuelve 400`, async () => {
    const res = await request.get(`/api/bookings?${query}`);

    assert.equal(res.status, 400);
    assert.ok(res.body.details.length >= 1);
  });
}