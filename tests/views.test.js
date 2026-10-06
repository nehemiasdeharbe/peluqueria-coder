import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB } from './helpers/db.js';

const request = supertest(app);

before(async () => {
  await setupTestDB();

  await request.post('/api/services').send({
    name: 'Corte Degradé',
    description: 'Corte con degradé y perfilado',
    duration: 45,
    price: 4500,
    category: 'peluqueria',
    available: true,
  });
  await request.post('/api/services').send({
    name: 'Alisado Keratina',
    description: 'Tratamiento de keratina',
    duration: 120,
    price: 25000,
    category: 'tratamientos',
    available: false,
  });
});

after(async () => {
  await teardownTestDB();
});

test('GET /views/services devuelve HTML con los servicios de la base', async () => {
  const res = await request.get('/views/services');

  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.text, /Corte Degradé/);
  assert.match(res.text, /Alisado Keratina/);
  assert.match(res.text, /45 min/);
  assert.match(res.text, /tratamientos/);
  assert.match(res.text, /No disponible/);
});

test('GET /views/services incluye el cliente de Socket.io', async () => {
  const res = await request.get('/views/services');

  assert.match(res.text, /\/socket\.io\/socket\.io\.js/);
  assert.match(res.text, /\/js\/socket\.js/);
});

test('GET /views/availability separa disponibles y no disponibles', async () => {
  const res = await request.get('/views/availability');

  assert.equal(res.status, 200);

  const [availablePart, unavailablePart] = res.text.split('id="unavailable-list"');
  assert.match(availablePart, /Corte Degradé/);
  assert.doesNotMatch(availablePart, /Alisado Keratina/);
  assert.match(unavailablePart, /Alisado Keratina/);
});

test('Las vistas reflejan un servicio nuevo creado por la API', async () => {
  await request.post('/api/services').send({
    name: 'Servicio Recién Creado',
    description: 'Prueba de datos reales',
    duration: 15,
    price: 999,
    category: 'peluqueria',
    available: true,
  });

  const res = await request.get('/views/services');
  assert.match(res.text, /Servicio Recién Creado/);
});

test('Los archivos estáticos se sirven desde /public', async () => {
  const js = await request.get('/js/socket.js');
  const css = await request.get('/css/styles.css');

  assert.equal(js.status, 200);
  assert.equal(css.status, 200);
});