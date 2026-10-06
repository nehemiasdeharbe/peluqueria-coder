import { createServer } from 'node:http';
import app from './app.js';
import env from './config/env.config.js';
import { connectDB } from './config/db.config.js';
import { initSocket } from './config/socket.config.js';

try {
  await connectDB();
} catch (error) {

  console.error(`[db] No se pudo conectar a MongoDB: ${error.message}`);
  process.exit(1);
}

const httpServer = createServer(app);
initSocket(httpServer, app);

httpServer.listen(env.port, () => {
  console.log(`Servidor corriendo en http://localhost:${env.port} (${env.nodeEnv})`);
});