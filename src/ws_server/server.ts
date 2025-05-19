import * as ws from 'ws';
import { createServer } from 'http';
import { httpServer } from '../http_server/index.js';

import { IncomingMessage } from './types/messages.js';
import { handleReg } from './handlers/reg.js';
import { send } from './utils/send.js';
import { addClient, removeClient } from './utils/broadcast.js';

import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;

const server = createServer(httpServer);
const wss = new ws.WebSocketServer({ server });

console.log(`WebSocket + HTTP server started on http://localhost:${PORT}`);

wss.on('connection', (socket: ws.WebSocket) => {
  console.log('Client connected');
  addClient(socket);

  socket.on('message', (rawData) => {
    try {
      const message: IncomingMessage = JSON.parse(rawData.toString());
      console.log('Received:', message);

      switch (message.type) {
        case 'reg':
          handleReg(socket, message);
          break;

        default:
          console.warn('Unknown message type:', message.type);
          send(socket, {
            type: 'error',
            data: `Unknown command: ${message.type}`,
            id: message.id,
          });
      }
    } catch (err) {
      console.error('Invalid message:', rawData.toString());
      send(socket, {
        type: 'error',
        data: 'Invalid message format',
        id: 0,
      });
    }
  });

  socket.on('close', () => {
    console.log('Client disconnected');
    removeClient(socket);
  });
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
