import WebSocket from 'ws';
import { OutgoingMessage } from '../types/messages';

export function send<T>(ws: WebSocket, message: OutgoingMessage<T>) {
  ws.send(JSON.stringify(message));
}
