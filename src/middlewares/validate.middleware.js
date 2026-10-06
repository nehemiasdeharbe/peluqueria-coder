const SOURCES = ['params', 'query', 'body'];

export const validate = (schemas) => (req, res, next) => {
  const validated = {};
  const details = [];

  for (const source of SOURCES) {
    const schema = schemas[source];
    if (!schema) continue;

    const result = schema.safeParse(req[source] ?? {});

    if (result.success) {
      validated[source] = result.data;
    } else {
      for (const issue of result.error.issues) {
        details.push({ field: issue.path.join('.') || source, message: issue.message });
      }
    }
  }

  if (details.length > 0) {
    const summary = details.map(({ message }) => message).join('; ');
    return res.status(400).json({ error: `Datos inválidos: ${summary}`, details });
  }

  req.validated = validated;
  next();
};