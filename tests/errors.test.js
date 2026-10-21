import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { asyncHandler } from '../src/utils/asyncHandler.js';
import { errorHandler, notFoundHandler } from '../src/middlewares/error.middleware.js';
import HttpError from '../src/utils/httpError.js';


const fakeRes = () => {
  const res = { statusCode: undefined, body: undefined };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};


test('asyncHandler ejecuta el controller y no llama a next si todo sale bien', async () => {
  const next = mock.fn();
  const res = fakeRes();

  await asyncHandler(async (req, response) => response.status(200).json({ ok: true }))({}, res, next);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(next.mock.callCount(), 0);
});

test('asyncHandler pasa a next() el error de una promesa rechazada', async () => {
  const next = mock.fn();
  const error = new HttpError(404, 'no existe');

  await asyncHandler(async () => {
    throw error;
  })({}, fakeRes(), next);

  assert.equal(next.mock.callCount(), 1);
  assert.equal(next.mock.calls[0].arguments[0], error);
});

test('asyncHandler también captura los errores lanzados de forma síncrona', async () => {
  const next = mock.fn();
  const error = new Error('falló');

  await asyncHandler(() => {
    throw error;
  })({}, fakeRes(), next);

  assert.equal(next.mock.callCount(), 1);
  assert.equal(next.mock.calls[0].arguments[0], error);
});


test('errorHandler responde con el código y el mensaje de un HttpError', () => {
  const res = fakeRes();

  errorHandler(new HttpError(404, 'No existe un servicio con id 1'), {}, res, () => {});

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: 'No existe un servicio con id 1' });
});

test('errorHandler responde 400 cuando el body no es un JSON válido', () => {
  const res = fakeRes();
  const error = Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed', status: 400 });

  errorHandler(error, {}, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'El body no es un JSON válido' });
});

test('errorHandler responde 500 sin exponer los detalles internos y registra el error', () => {
  const res = fakeRes();
  const log = mock.method(console, 'error', () => {});

  errorHandler(new Error('password de la base: secreta'), {}, res, () => {});
  log.mock.restore();

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Error interno del servidor' });
  assert.equal(log.mock.callCount(), 1);
});

test('notFoundHandler responde 404', () => {
  const res = fakeRes();

  notFoundHandler({}, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: 'Ruta no encontrada' });
});