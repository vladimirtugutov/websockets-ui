import * as ws from 'ws';
import { OutgoingMessage } from '../types/messages.js';

export function send<T>(socket: ws.WebSocket, message: OutgoingMessage<T>) {
  socket.send(JSON.stringify(message));
}
