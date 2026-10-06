import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB } from './helpers/db.js';

const request = supertest(app);

const SEED = [
  ['Corte clásico', 'corte', 4000, 30, true],
  ['Corte degradé', 'corte', 4500, 45, true],
  ['Corte niños', 'corte', 3000, 25, true],
  ['Corte y barba', 'corte', 6000, 50, false],
  ['Perfilado de barba', 'corte', 2500, 15, true],
  ['Rapado', 'corte', 2000, 15, false],
  ['Tintura raíz', 'color', 9000, 90, true],
  ['Tintura completa', 'color', 14000, 120, true],
  ['Mechas', 'color', 18000, 150, false],
  ['Alisado keratina', 'tratamientos', 25000, 120, true],
  ['Hidratación', 'tratamientos', 7000, 45, true],
  ['Botox capilar', 'tratamientos', 22000, 90, false],
];

before(async () => {
  await setupTestDB();

  for (const [name, category, price, duration, available] of SEED) {
    await request
      .post('/api/services')
      .send({ name, description: `Descripción de ${name}`, category, price, duration, available });
  }
});

after(async () => {
  await teardownTestDB();
});

const names = (res) => res.body.services.map((s) => s.name);

test('Sin parámetros usa page=1 y limit=10 y devuelve los metadatos', async () => {
  const res = await request.get('/api/services');

  assert.equal(res.status, 200);
  assert.equal(res.body.services.length, 10);
  assert.equal(res.body.total, 12);
  assert.equal(res.body.page, 1);
  assert.equal(res.body.limit, 10);
  assert.equal(res.body.totalPages, 2);
  assert.equal(res.body.hasPrevPage, false);
  assert.equal(res.body.hasNextPage, true);
});

test('page y limit paginan el listado', async () => {
  const page2 = await request.get('/api/services?page=2&limit=5');

  assert.equal(page2.status, 200);
  assert.equal(page2.body.services.length, 5);
  assert.equal(page2.body.page, 2);
  assert.equal(page2.body.limit, 5);
  assert.equal(page2.body.totalPages, 3);
  assert.equal(page2.body.hasPrevPage, true);
  assert.equal(page2.body.hasNextPage, true);

  const last = await request.get('/api/services?page=3&limit=5');
  assert.equal(last.body.services.length, 2);
  assert.equal(last.body.hasNextPage, false);
});

test('Las páginas no repiten ni saltean servicios', async () => {
  const seen = [];
  for (const page of [1, 2, 3]) {
    const res = await request.get(`/api/services?page=${page}&limit=5&sortBy=price`);
    seen.push(...res.body.services.map((s) => s.id));
  }

  assert.equal(seen.length, 12);
  assert.equal(new Set(seen).size, 12);
});

test('Una página fuera de rango devuelve lista vacía con metadatos', async () => {
  const res = await request.get('/api/services?page=9&limit=5');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.services, []);
  assert.equal(res.body.total, 12);
  assert.equal(res.body.hasNextPage, false);
  assert.equal(res.body.hasPrevPage, true);
});

test('category filtra sin distinguir mayúsculas', async () => {
  const res = await request.get('/api/services?category=COLOR');

  assert.equal(res.body.total, 3);
  assert.ok(res.body.services.every((s) => s.category === 'color'));
});

test('category se busca como texto literal, no como expresión regular', async () => {
  const res = await request.get('/api/services?category=co.or');

  assert.equal(res.status, 200);
  assert.equal(res.body.total, 0);
});

test('available filtra por disponibilidad', async () => {
  const yes = await request.get('/api/services?available=true&limit=100');
  const no = await request.get('/api/services?available=false&limit=100');

  assert.equal(yes.body.total, 8);
  assert.ok(yes.body.services.every((s) => s.available === true));
  assert.equal(no.body.total, 4);
  assert.ok(no.body.services.every((s) => s.available === false));
});

test('Los filtros se combinan con la paginación y el total refleja el filtro', async () => {
  const res = await request.get('/api/services?category=corte&available=true&limit=2&page=2');

  assert.equal(res.body.total, 4);
  assert.equal(res.body.totalPages, 2);
  assert.equal(res.body.services.length, 2);
  assert.ok(res.body.services.every((s) => s.category === 'corte' && s.available === true));
});

test('sortBy=price ordena ascendente por defecto', async () => {
  const res = await request.get('/api/services?sortBy=price&limit=100');
  const prices = res.body.services.map((s) => s.price);

  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
});

test('sortBy=price&order=desc ordena descendente', async () => {
  const res = await request.get('/api/services?sortBy=price&order=desc&limit=3');

  assert.deepEqual(res.body.services.map((s) => s.price), [25000, 22000, 18000]);
});

test('sortBy=duration ordena por duración', async () => {
  const res = await request.get('/api/services?sortBy=duration&order=desc&limit=100');
  const durations = res.body.services.map((s) => s.duration);

  assert.deepEqual(durations, [...durations].sort((a, b) => b - a));
});

test('sortBy=name ordena alfabéticamente', async () => {
  const res = await request.get('/api/services?sortBy=name&limit=100');

  assert.deepEqual(names(res), [...names(res)].sort());
});

test('Filtros, orden y paginación funcionan juntos', async () => {
  const res = await request.get('/api/services?category=tratamientos&sortBy=price&order=desc&limit=2');

  assert.deepEqual(names(res), ['Alisado keratina', 'Botox capilar']);
  assert.equal(res.body.total, 3);
  assert.equal(res.body.hasNextPage, true);
});

test('Los parámetros desconocidos se ignoran', async () => {
  const res = await request.get('/api/services?foo=bar&limit=3');

  assert.equal(res.status, 200);
  assert.equal(res.body.services.length, 3);
});

for (const [query, expected] of [
  ['page=0', /page/],
  ['page=-1', /page/],
  ['page=abc', /page/],
  ['page=1.5', /page/],
  ['limit=0', /limit/],
  ['limit=101', /limit/],
  ['limit=abc', /limit/],
  ['sortBy=password', /sortBy/],
  ['order=up', /order/],
  ['available=maybe', /available/],
  ['category=', /category/],
]) {
  test(`GET /api/services?${query} devuelve 400 con un mensaje claro`, async () => {
    const res = await request.get(`/api/services?${query}`);

    assert.equal(res.status, 400);
    assert.match(res.body.error, expected);
    assert.ok(Array.isArray(res.body.details) && res.body.details.length > 0);
  });
}