import app from './app.js';
import env from './config/env.config.js';
import { connectDB } from './config/db.config.js';

try {
  await connectDB();
} catch (error) {

  console.error(`[db] No se pudo conectar a MongoDB: ${error.message}`);
  process.exit(1);
}

app.listen(env.port, () => {
  console.log(`Servidor corriendo en http://localhost:${env.port} (${env.nodeEnv})`);
});