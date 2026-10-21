import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import Booking from '../src/models/booking.model.js';
import { setupTestDB, teardownTestDB } from './helpers/db.js';


const request = supertest(app);

const NONEXISTENT_ID = '507f1f77bcf86cd799439011';

const validBooking = {
  clientName: 'Ana Gómez',
  clientEmail: 'ana@mail.com',
  date: '2026-10-10',
  time: '14:30',
};

let serviceId;
let bookingId;

before(async () => {
  await setupTestDB();

  const service = await request.post('/api/services').send({
    name: 'Corte',
    description: 'Corte de pelo',
    duration: 30,
    price: 3000,
    category: 'peluqueria',
    available: true,
  });
  serviceId = service.body.id;

  const booking = await request.post('/api/bookings').send(validBooking);
  bookingId = booking.body.id;
});

after(async () => {
  await teardownTestDB();
});


for (const email of ['sin-arroba.com', '@mail.com', 'ana@', 'ana@mail', 'ana@@mail.com', 'ana mail@mail.com', 123]) {
  test(`POST /api/bookings con clientEmail ${JSON.stringify(email)} devuelve 400`, async () => {
    const res = await request.post('/api/bookings').send({ ...validBooking, clientEmail: email });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /clientEmail/);
  });
}


for (const date of ['2026-1-1', '26-10-10', '2026/10/10', '10-10-2026', '2026-13-01', '2026-00-10', '2026-04-31', '2027-02-29', 'mañana', 20261010]) {
  test(`POST /api/bookings con date ${JSON.stringify(date)} devuelve 400`, async () => {
    const res = await request.post('/api/bookings').send({ ...validBooking, date });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /date/);
  });
}

test('POST /api/bookings acepta un 29 de febrero de un año bisiesto', async () => {
  const res = await request.post('/api/bookings').send({ ...validBooking, date: '2028-02-29' });

  assert.equal(res.status, 201);
});


for (const time of ['24:00', '12:60', '9:30', '12.30', '1230', '12:3', 'mediodía', 1230]) {
  test(`POST /api/bookings con time ${JSON.stringify(time)} devuelve 400`, async () => {
    const res = await request.post('/api/bookings').send({ ...validBooking, time });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /time/);
  });
}


test('POST /api/bookings con clientName en blanco devuelve 400', async () => {
  const res = await request.post('/api/bookings').send({ ...validBooking, clientName: '   ' });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /clientName/);
});

test('POST /api/bookings con un body que es un array devuelve 400', async () => {
  const res = await request.post('/api/bookings').send([validBooking]);

  assert.equal(res.status, 400);
});

test('POST /api/bookings sin body devuelve 400 e informa los campos obligatorios', async () => {
  const res = await request.post('/api/bookings');

  assert.equal(res.status, 400);
  assert.deepEqual(
    res.body.details.map((d) => d.field).sort(),
    ['clientEmail', 'clientName', 'date', 'time']
  );
});

test('POST /api/bookings con un JSON mal formado devuelve 400', async () => {
  const res = await request
    .post('/api/bookings')
    .set('Content-Type', 'application/json')
    .send('{"clientName": ');

  assert.equal(res.status, 400);
  assert.match(res.body.error, /JSON/);
});

test('POST /api/bookings con status vacío devuelve 400', async () => {
  const res = await request.post('/api/bookings').send({ ...validBooking, status: '' });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /status/);
});


for (const [label, services, expectedStatus] of [
  ['un elemento que no es un objeto', [5], 400],
  ['un elemento null', [null], 400],
  ['quantity como texto', [{ service: 'a'.repeat(24), quantity: '2' }], 400],
  ['quantity negativa', [{ service: 'a'.repeat(24), quantity: -1 }], 400],
  ['un id con formato inválido', [{ service: 'abc', quantity: 1 }], 400],
  ['un servicio con formato válido pero inexistente', [{ service: NONEXISTENT_ID, quantity: 1 }], 400],
]) {
  test(`POST /api/bookings con services con ${label} devuelve ${expectedStatus}`, async () => {
    const res = await request.post('/api/bookings').send({ ...validBooking, services });

    assert.equal(res.status, expectedStatus);
  });
}

test('POST /api/bookings con un servicio existente y otro inexistente no crea la reserva', async () => {
  const before = await Booking.countDocuments();

  const res = await request.post('/api/bookings').send({
    ...validBooking,
    services: [{ service: serviceId, quantity: 1 }, { service: NONEXISTENT_ID, quantity: 1 }],
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /no existe un servicio/);
  assert.equal(await Booking.countDocuments(), before);
});


test('GET /api/bookings/:bid con un id inexistente o inválido devuelve 404', async () => {
  const nonexistent = await request.get(`/api/bookings/${NONEXISTENT_ID}`);
  const malformed = await request.get('/api/bookings/xyz');

  assert.equal(nonexistent.status, 404);
  assert.match(nonexistent.body.error, /No existe una reserva/);
  assert.equal(malformed.status, 404);
});

test('POST /api/bookings/:bid/services/:sid con una reserva inexistente devuelve 404 indicando la reserva', async () => {
  const res = await request.post(`/api/bookings/${NONEXISTENT_ID}/services/${serviceId}`);

  assert.equal(res.status, 404);
  assert.match(res.body.error, /No existe una reserva/);
});

test('POST /api/bookings/:bid/services/:sid con un servicio inexistente devuelve 404 indicando el servicio', async () => {
  const res = await request.post(`/api/bookings/${bookingId}/services/${NONEXISTENT_ID}`);

  assert.equal(res.status, 404);
  assert.match(res.body.error, /No existe un servicio/);
});

test('POST /api/bookings/:bid/services/:sid con la reserva y el servicio inexistentes informa primero la reserva', async () => {
  const res = await request.post(`/api/bookings/${NONEXISTENT_ID}/services/${NONEXISTENT_ID}`);

  assert.equal(res.status, 404);
  assert.match(res.body.error, /No existe una reserva/);
});

test('POST /api/bookings/:bid/services/:sid con ids inválidos devuelve 400 y no modifica nada', async () => {
  const before = await Booking.findById(bookingId).lean();

  const res = await request.post(`/api/bookings/not-an-id/services/${serviceId}`);

  assert.equal(res.status, 400);
  assert.deepEqual(await Booking.findById(bookingId).lean(), before);
});

test('POST /api/bookings/:bid/services/:sid acepta los ids en mayúsculas y no duplica el servicio', async () => {
  await request.post(`/api/bookings/${bookingId}/services/${serviceId}`);
  const res = await request.post(`/api/bookings/${bookingId.toUpperCase()}/services/${serviceId.toUpperCase()}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.services.length, 1);
  assert.equal(res.body.services[0].quantity, 2);
});