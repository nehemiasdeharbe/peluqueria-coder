import { z } from 'zod';

const byInput = (missing, wrongType) => (issue) =>
  issue.input === undefined ? missing : wrongType;

const label = (field, kind) => `El ${kind} "${field}"`;

export const requiredText = (field, kind = 'campo') =>
  z
    .string({
      error: byInput(`Falta el ${kind} requerido: ${field}`, `${label(field, kind)} debe ser un texto`),
    })
    .trim()
    .min(1, { error: `${label(field, kind)} no puede estar vacío` });

export const requiredNumber = (field) =>
  z.number({
    error: byInput(`Falta el campo requerido: ${field}`, `${label(field, 'campo')} debe ser un número`),
  });

export const requiredBoolean = (field) =>
  z.boolean({
    error: byInput(`Falta el campo requerido: ${field}`, `${label(field, 'campo')} debe ser true o false`),
  });

export const objectId = (field, kind = 'campo') =>
  z
    .string({
      error: byInput(`Falta el ${kind} requerido: ${field}`, `${label(field, kind)} debe ser un texto`),
    })
    .regex(/^[0-9a-fA-F]{24}$/, {
      error: `${label(field, kind)} no es un id válido (deben ser 24 caracteres hexadecimales)`,
    });

export const queryInteger = (field, { min = 1, max, defaultValue }) => {
  const rangeText = max ? `entre ${min} y ${max}` : `mayor o igual a ${min}`;
  const error = `${label(field, 'parámetro')} debe ser un número entero ${rangeText}`;

  let schema = z.coerce.number({ error }).int({ error }).min(min, { error });
  if (max) schema = schema.max(max, { error });
  return schema.default(defaultValue);
};