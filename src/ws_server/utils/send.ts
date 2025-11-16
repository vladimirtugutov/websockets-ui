import * as ws from 'ws';
import { OutgoingMessage } from '../types/messages';

export function send<T>(socket: ws.WebSocket, message: OutgoingMessage<T>) {
  const json = JSON.stringify({
    ...message,
    data: JSON.stringify(message.data),
  });

  console.log('Sending:\n', json);
  socket.send(json);
}
