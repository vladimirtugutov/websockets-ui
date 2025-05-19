import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { httpServer } from '../http_server/index.js';
import { IncomingMessage } from './types/messages.js';
import { send } from './utils/send.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = createServer(httpServer);
const wss = new WebSocketServer({ server });

console.log(`WebSocket + HTTP server started on http://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (rawData) => {
    try {
      const message: IncomingMessage = JSON.parse(rawData.toString());
      console.log('📥 Received:', message);

      send(ws, {
        type: message.type,
        data: message.data,
        id: message.id,
      });
    } catch (err) {
      console.error('Invalid message:', rawData.toString());
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`🌐 Listening on http://localhost:${PORT}`);
});
