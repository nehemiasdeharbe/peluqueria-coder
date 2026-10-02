import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import supertest from 'supertest';
import app from '../src/app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICES_PATH = join(__dirname, '..', 'src', 'data', 'services.json');

const request = supertest(app);
let originalServices;

before(async () => {
  originalServices = await readFile(SERVICES_PATH, 'utf-8');
});

after(async () => {
  await writeFile(SERVICES_PATH, originalServices, 'utf-8');
});

test('GET /api/services devuelve 200 y un array', async () => {
  const res = await request.get('/api/services');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('GET /api/services?available=true devuelve solo disponibles', async () => {
  const res = await request.get('/api/services?available=true');
  assert.equal(res.status, 200);
  assert.ok(res.body.every((s) => s.available === true));
});

test('GET /api/services?available=invalido devuelve 400', async () => {
  const res = await request.get('/api/services?available=invalido');
  assert.equal(res.status, 400);
});

test('GET /api/services/:sid con id inexistente devuelve 404', async () => {
  const res = await request.get('/api/services/99999');
  assert.equal(res.status, 404);
});

test('POST /api/services crea un servicio y genera el id (201)', async () => {
  const res = await request.post('/api/services').send({
    name: 'Depilación',
    description: 'Depilación con cera',
    duration: 40,
    price: 5000,
    category: 'estetica',
    available: true,
  });

  assert.equal(res.status, 201);
  assert.ok(res.body.id);

  const getRes = await request.get(`/api/services/${res.body.id}`);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.name, 'Depilación');
});

test('POST /api/services ignora el id recibido y lo genera internamente', async () => {
  const res = await request.post('/api/services').send({
    id: 999,
    name: 'Peinado',
    description: 'Peinado para eventos',
    duration: 50,
    price: 6000,
    category: 'peluqueria',
    available: true,
  });

  assert.equal(res.status, 201);
  assert.notEqual(res.body.id, 999);
});

test('POST /api/services con campos faltantes devuelve 400', async () => {
  const res = await request.post('/api/services').send({ name: 'Incompleto' });
  assert.equal(res.status, 400);
});

test('POST /api/services con price no numérico devuelve 400', async () => {
  const res = await request.post('/api/services').send({
    name: 'Servicio inválido',
    description: 'Prueba de validación',
    duration: 30,
    price: 'gratis',
    category: 'peluqueria',
    available: true,
  });

  assert.equal(res.status, 400);
});

test('PUT /api/services/:sid actualiza campos sin tocar el id', async () => {
  const createRes = await request.post('/api/services').send({
    name: 'Servicio a actualizar',
    description: 'Original',
    duration: 20,
    price: 1000,
    category: 'peluqueria',
    available: true,
  });
  const id = createRes.body.id;

  const putRes = await request.put(`/api/services/${id}`).send({
    id: 1,
    price: 1500,
  });

  assert.equal(putRes.status, 200);
  assert.equal(putRes.body.id, id);
  assert.equal(putRes.body.price, 1500);
  assert.equal(putRes.body.name, 'Servicio a actualizar');
});

test('PUT /api/services/:sid con id inexistente devuelve 404', async () => {
  const res = await request.put('/api/services/99999').send({ price: 100 });
  assert.equal(res.status, 404);
});

test('DELETE /api/services/:sid elimina el servicio', async () => {
  const createRes = await request.post('/api/services').send({
    name: 'Servicio a borrar',
    description: 'Temporal',
    duration: 15,
    price: 500,
    category: 'peluqueria',
    available: true,
  });
  const id = createRes.body.id;

  const deleteRes = await request.delete(`/api/services/${id}`);
  assert.equal(deleteRes.status, 200);

  const getRes = await request.get(`/api/services/${id}`);
  assert.equal(getRes.status, 404);
});

test('DELETE /api/services/:sid con id inexistente devuelve 404', async () => {
  const res = await request.delete('/api/services/99999');
  assert.equal(res.status, 404);
});