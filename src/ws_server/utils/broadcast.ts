import * as ws from 'ws';
import { OutgoingMessage } from '../types/messages.js';

const clients = new Set<ws.WebSocket>();

export function addClient(socket: ws.WebSocket) {
  clients.add(socket);
}

export function removeClient(socket: ws.WebSocket) {
  clients.delete(socket);
}

export function broadcast<T>(message: OutgoingMessage<T>) {
  const msg = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === ws.WebSocket.OPEN) {
      client.send(msg);
    }
  }
}
