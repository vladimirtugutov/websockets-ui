import * as ws from 'ws';
import { createServer } from 'http';
import { httpHandler } from '../http_server/index.js';
import { IncomingMessage } from './types/messages.js';
import { handleReg } from './handlers/reg.js';
import { send } from './utils/send.js';
import { addClient, removeClient } from './utils/broadcast.js';
import {
  handleCreateRoom,
  handleAddUserToRoom,
  handleSinglePlay,
} from './handlers/room.js';
import { handleAddShips } from './handlers/ships.js';
import { handleAttack, handleRandomAttack } from './handlers/game.js';

import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;
const server = createServer(httpHandler);
const wss = new ws.WebSocketServer({ server });

console.log(`✅ WebSocket + HTTP server started on http://localhost:${PORT}`);

wss.on('connection', (socket: ws.WebSocket) => {
  console.log('🔌 Client connected');
  addClient(socket);

  socket.on('message', (rawData) => {
    try {
      const rawStr = rawData.toString();
      let message: IncomingMessage = JSON.parse(rawStr);

      message = normalizeMessageData(message);

      console.log('📥 Received:', message);

      switch (message.type) {
        case 'reg':
          handleReg(socket, message);
          break;
        case 'create_room':
          handleCreateRoom(socket, message);
          break;
        case 'add_user_to_room':
          handleAddUserToRoom(socket, message);
          break;
        case 'add_ships':
          handleAddShips(socket, message);
          break;
        case 'attack':
          handleAttack(socket, message);
          break;
        case 'randomAttack':
          handleRandomAttack(socket, message);
          break;
        case 'single_play':
          handleSinglePlay(socket, message);
          break;
        default:
          console.warn('⚠️ Unknown message type:', message.type);
          send(socket, {
            type: 'error',
            data: `Unknown command: ${message.type}`,
            id: message.id,
          });
      }
    } catch (err) {
      console.error('❌ Invalid message format:', rawData.toString());
      send(socket, {
        type: 'error',
        data: 'Invalid message format',
        id: 0,
      });
    }
  });

  socket.on('close', () => {
    console.log('🔌 Client disconnected');
    removeClient(socket);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Listening on http://localhost:${PORT}`);
});

function normalizeMessageData(message: IncomingMessage): IncomingMessage {
  let { data } = message;

  while (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      break;
    }
  }

  return {
    ...message,
    data,
  };
}
