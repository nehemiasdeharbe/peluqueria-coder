import express from 'express';
import env from './config/env.config.js';
import servicesRouter from './router/router.js';

const app = express();

app.use(express.json());
app.use('/api/services', servicesRouter);

app.listen(env.port, () => {
  console.log(`Servidor corriendo en http://localhost:${env.port} (${env.nodeEnv})`);
});