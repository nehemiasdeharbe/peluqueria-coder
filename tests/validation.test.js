import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import Service from '../src/models/service.model.js';
import Booking from '../src/models/booking.model.js';
import { setupTestDB, teardownTestDB } from './helpers/db.js';

const request = supertest(app);

const validService = {
  name: 'Corte',
  description: 'Corte de pelo',
  duration: 30,
  price: 3000,
  category: 'peluqueria',
  available: true,
};

const validBooking = {
  clientName: 'Ana Gómez',
  clientEmail: 'ana@mail.com',
  date: '2026-10-10',
  time: '14:30',
};

let validServiceId;

before(async () => {
  await setupTestDB();
  const res = await request.post('/api/services').send(validService);
  validServiceId = res.body.id;
});

after(async () => {
  await teardownTestDB();
});

for (const [label, change, expected] of [
  ['sin name', { name: undefined }, /Falta el campo requerido: name/],
  ['con name vacío', { name: '   ' }, /"name" no puede estar vacío/],
  ['con name numérico', { name: 5 }, /"name" debe ser un texto/],
  ['sin description', { description: undefined }, /Falta el campo requerido: description/],
  ['sin category', { category: undefined }, /Falta el campo requerido: category/],
  ['con duration en texto', { duration: '30' }, /"duration" debe ser un número/],
  ['con duration 0', { duration: 0 }, /"duration" debe ser un número mayor a 0/],
  ['con duration negativa', { duration: -5 }, /"duration"/],
  ['sin price', { price: undefined }, /Falta el campo requerido: price/],
  ['con price en texto', { price: 'gratis' }, /"price" debe ser un número/],
  ['con price negativo', { price: -1 }, /"price" debe ser un número mayor o igual a 0/],
  ['sin available', { available: undefined }, /Falta el campo requerido: available/],
  ['con available en texto', { available: 'si' }, /"available" debe ser true o false/],
]) {
  test(`POST /api/services ${label} devuelve 400`, async () => {
    const res = await request.post('/api/services').send({ ...validService, ...change });

    assert.equal(res.status, 400);
    assert.match(res.body.error, expected);
    assert.ok(res.body.details.length >= 1);
  });
}

test('POST /api/services informa todos los errores juntos', async () => {
  const res = await request.post('/api/services').send({ name: 'Solo nombre' });

  assert.equal(res.status, 400);
  assert.equal(res.body.details.length, 5);
  assert.deepEqual(
    res.body.details.map((d) => d.field).sort(),
    ['available', 'category', 'description', 'duration', 'price']
  );
});

test('POST /api/services con un body que no es un objeto devuelve 400', async () => {
  const res = await request.post('/api/services').send([1, 2, 3]);

  assert.equal(res.status, 400);
  assert.match(res.body.error, /objeto JSON/);
});

test('POST /api/services inválido no llega a la base de datos', async () => {
  const before = await Service.countDocuments();

  await request.post('/api/services').send({ ...validService, price: 'gratis' });
  await request.post('/api/services').send({ name: 'x' });

  assert.equal(await Service.countDocuments(), before);
});

test('POST /api/services descarta los campos que no pertenecen al servicio', async () => {
  const res = await request.post('/api/services').send({ ...validService, id: 999, extra: 'x', role: 'admin' });

  assert.equal(res.status, 201);
  assert.equal('extra' in res.body, false);
  assert.equal('role' in res.body, false);
});


for (const [label, body, expected] of [
  ['price negativo', { price: -10 }, /"price"/],
  ['price en texto', { price: '100' }, /"price" debe ser un número/],
  ['name vacío', { name: '' }, /"name" no puede estar vacío/],
  ['duration 0', { duration: 0 }, /"duration"/],
  ['available en texto', { available: 'false' }, /"available" debe ser true o false/],
  ['category null', { category: null }, /"category" debe ser un texto/],
]) {
  test(`PUT /api/services/:sid con ${label} devuelve 400`, async () => {
    const res = await request.put(`/api/services/${validServiceId}`).send(body);

    assert.equal(res.status, 400);
    assert.match(res.body.error, expected);
  });
}

test('PUT /api/services/:sid inválido no modifica el servicio en la base', async () => {
  await request.put(`/api/services/${validServiceId}`).send({ name: 'Nuevo nombre', price: -5 });

  const stored = await Service.findById(validServiceId).lean();
  assert.equal(stored.name, 'Corte');
  assert.equal(stored.price, 3000);
});

test('PUT /api/services/:sid acepta una actualización parcial válida', async () => {
  const res = await request.put(`/api/services/${validServiceId}`).send({ price: 3500 });

  assert.equal(res.status, 200);
  assert.equal(res.body.price, 3500);
  assert.equal(res.body.name, 'Corte');
});


for (const [label, change, expected] of [
  ['sin clientName', { clientName: undefined }, /Falta el campo requerido: clientName/],
  ['sin clientEmail', { clientEmail: undefined }, /Falta el campo requerido: clientEmail/],
  ['con email sin arroba', { clientEmail: 'ana.mail.com' }, /"clientEmail" no tiene un formato válido/],
  ['con email con espacios', { clientEmail: 'a na@mail.com' }, /"clientEmail" no tiene un formato válido/],
  ['sin date', { date: undefined }, /Falta el campo requerido: date/],
  ['con date en otro formato', { date: '10/10/2026' }, /YYYY-MM-DD/],
  ['con date inexistente', { date: '2026-02-31' }, /fecha real/],
  ['sin time', { time: undefined }, /Falta el campo requerido: time/],
  ['con time inválido', { time: '25:00' }, /HH:mm/],
  ['con time sin ceros', { time: '9:30' }, /HH:mm/],
  ['con services que no es un array', { services: 'x' }, /"services" debe ser un array/],
  ['con un servicio sin id', { services: [{ quantity: 1 }] }, /Falta el campo requerido: service/],
  ['con un servicio de id inválido', { services: [{ service: '123', quantity: 1 }] }, /no es un id válido/],
  ['con quantity 0', { services: [{ service: 'a'.repeat(24), quantity: 0 }] }, /"quantity" debe ser mayor o igual a 1/],
  ['con quantity decimal', { services: [{ service: 'a'.repeat(24), quantity: 1.5 }] }, /"quantity" debe ser un número entero/],
]) {
  test(`POST /api/bookings ${label} devuelve 400`, async () => {
    const res = await request.post('/api/bookings').send({ ...validBooking, ...change });

    assert.equal(res.status, 400);
    assert.match(res.body.error, expected);
  });
}

test('POST /api/bookings inválido no llega a la base de datos', async () => {
  const before = await Booking.countDocuments();

  await request.post('/api/bookings').send({ ...validBooking, clientEmail: 'mal' });
  await request.post('/api/bookings').send({ clientName: 'x' });

  assert.equal(await Booking.countDocuments(), before);
});

test('POST /api/bookings válido aplica los valores por defecto', async () => {
  const res = await request.post('/api/bookings').send(validBooking);

  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'pendiente');
  assert.deepEqual(res.body.services, []);
});

test('POST /api/bookings con servicios repetidos acumula la cantidad', async () => {
  const res = await request.post('/api/bookings').send({
    ...validBooking,
    services: [
      { service: validServiceId, quantity: 2 },
      { service: validServiceId },
    ],
  });

  assert.equal(res.status, 201);
  assert.deepEqual(res.body.services, [{ service: validServiceId, quantity: 3 }]);
});


test('POST /api/bookings/:bid/services/:sid con bid inválido devuelve 400', async () => {
  const res = await request.post(`/api/bookings/abc/services/${validServiceId}`);

  assert.equal(res.status, 400);
  assert.match(res.body.error, /parámetro "bid" no es un id válido/);
});

test('POST /api/bookings/:bid/services/:sid con sid inválido devuelve 400', async () => {
  const booking = await request.post('/api/bookings').send(validBooking);
  const res = await request.post(`/api/bookings/${booking.body.id}/services/99999`);

  assert.equal(res.status, 400);
  assert.match(res.body.error, /parámetro "sid" no es un id válido/);
});

test('POST /api/bookings/:bid/services/:sid con los dos ids inválidos informa ambos errores', async () => {
  const res = await request.post('/api/bookings/x/services/y');

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.details.map((d) => d.field).sort(), ['bid', 'sid']);
});