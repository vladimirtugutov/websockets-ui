import WebSocket from 'ws';
import { OutgoingMessage } from '../types/messages';

export function send<T>(ws: WebSocket, message: OutgoingMessage<T>) {
  const doubleSerialized = {
    ...message,
    data: JSON.stringify(message.data),
  };

  const json = JSON.stringify(doubleSerialized);
  console.log('📤 Sending:\n', json);
  ws.send(json);
}
