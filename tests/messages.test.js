import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import Message from '../src/models/message.model.js';
import { setupTestDB, teardownTestDB } from './helpers/db.js';

const request = supertest(app);

const validMessage = {
  clientName: 'Ana Gómez',
  clientEmail: 'ana@mail.com',
  message: 'Hola, quisiera consultar por un turno de tintura.',
};

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});


test('POST /api/messages crea un mensaje (201)', async () => {
  const res = await request.post('/api/messages').send(validMessage);

  assert.equal(res.status, 201);
  assert.ok(res.body.id);
  assert.equal(res.body.clientName, 'Ana Gómez');
  assert.equal(res.body.clientEmail, 'ana@mail.com');
  assert.equal(res.body.message, validMessage.message);
  assert.ok(res.body.createdAt);
  assert.ok(res.body.updatedAt);
});

test('POST /api/messages descarta los campos que no pertenecen al mensaje y recorta los espacios', async () => {
  const res = await request
    .post('/api/messages')
    .send({ ...validMessage, message: '   Con espacios   ', id: 'x', role: 'admin' });

  assert.equal(res.status, 201);
  assert.equal(res.body.message, 'Con espacios');
  assert.notEqual(res.body.id, 'x');
  assert.equal('role' in res.body, false);
});

for (const [label, change, expected] of [
  ['sin clientName', { clientName: undefined }, /Falta el campo requerido: clientName/],
  ['con clientName vacío', { clientName: '  ' }, /"clientName" no puede estar vacío/],
  ['sin clientEmail', { clientEmail: undefined }, /Falta el campo requerido: clientEmail/],
  ['con email inválido', { clientEmail: 'no-es-email' }, /"clientEmail" no tiene un formato válido/],
  ['sin message', { message: undefined }, /Falta el campo requerido: message/],
  ['con message vacío', { message: '' }, /"message" no puede estar vacío/],
  ['con message numérico', { message: 123 }, /"message" debe ser un texto/],
  ['con message de más de 1000 caracteres', { message: 'a'.repeat(1001) }, /no puede superar los 1000 caracteres/],
]) {
  test(`POST /api/messages ${label} devuelve 400`, async () => {
    const res = await request.post('/api/messages').send({ ...validMessage, ...change });

    assert.equal(res.status, 400);
    assert.match(res.body.error, expected);
    assert.ok(res.body.details.length >= 1);
  });
}

test('POST /api/messages acepta un message de exactamente 1000 caracteres', async () => {
  const res = await request.post('/api/messages').send({ ...validMessage, message: 'a'.repeat(1000) });

  assert.equal(res.status, 201);
});

test('POST /api/messages inválido no llega a la base de datos', async () => {
  const before = await Message.countDocuments();

  await request.post('/api/messages').send({ ...validMessage, clientEmail: 'mal' });
  await request.post('/api/messages').send({});

  assert.equal(await Message.countDocuments(), before);
});


test('GET /api/messages devuelve el listado paginado, del más nuevo al más viejo', async () => {
  await Message.deleteMany({});
  for (let i = 1; i <= 5; i++) {
    await request.post('/api/messages').send({ ...validMessage, message: `Mensaje ${i}` });
  }

  const res = await request.get('/api/messages?limit=2');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.messages.map((m) => m.message), ['Mensaje 5', 'Mensaje 4']);
  assert.equal(res.body.total, 5);
  assert.equal(res.body.page, 1);
  assert.equal(res.body.limit, 2);
  assert.equal(res.body.totalPages, 3);
  assert.equal(res.body.hasPrevPage, false);
  assert.equal(res.body.hasNextPage, true);
});

test('GET /api/messages?page=3 devuelve la última página', async () => {
  const res = await request.get('/api/messages?page=3&limit=2');

  assert.deepEqual(res.body.messages.map((m) => m.message), ['Mensaje 1']);
  assert.equal(res.body.hasPrevPage, true);
  assert.equal(res.body.hasNextPage, false);
});

for (const query of ['page=0', 'page=abc', 'limit=0', 'limit=101', 'limit=abc']) {
  test(`GET /api/messages?${query} devuelve 400`, async () => {
    const res = await request.get(`/api/messages?${query}`);

    assert.equal(res.status, 400);
    assert.ok(res.body.details.length >= 1);
  });
}


test('GET /api/messages/:mid devuelve el mensaje', async () => {
  const created = await request.post('/api/messages').send(validMessage);

  const res = await request.get(`/api/messages/${created.body.id}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.id, created.body.id);
  assert.equal(res.body.clientName, 'Ana Gómez');
});

test('GET /api/messages/:mid con un id inexistente o inválido devuelve 404', async () => {
  const nonexistent = await request.get('/api/messages/507f1f77bcf86cd799439011');
  const malformed = await request.get('/api/messages/abc');

  assert.equal(nonexistent.status, 404);
  assert.match(nonexistent.body.error, /No existe un mensaje/);
  assert.equal(malformed.status, 404);
});

test('DELETE /api/messages/:mid elimina el mensaje', async () => {
  const created = await request.post('/api/messages').send(validMessage);

  const deleteRes = await request.delete(`/api/messages/${created.body.id}`);
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.body.id, created.body.id);

  const getRes = await request.get(`/api/messages/${created.body.id}`);
  assert.equal(getRes.status, 404);
});

test('DELETE /api/messages/:mid con un id inexistente devuelve 404', async () => {
  const res = await request.delete('/api/messages/507f1f77bcf86cd799439011');

  assert.equal(res.status, 404);
});