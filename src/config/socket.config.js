import { Server } from 'socket.io';

export function initSocket(httpServer, app) {
  const io = new Server(httpServer);
  app.set('io', io);
  return io;
}