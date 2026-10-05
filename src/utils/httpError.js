/**
 * Error de negocio con código HTTP asociado.
 * Los services lo lanzan sin conocer req/res; el controller lo traduce a respuesta.
 */
export default class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}