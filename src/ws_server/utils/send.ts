import * as ws from 'ws';
import { OutgoingMessage } from '../types/messages';

export function send<T>(socket: ws.WebSocket, message: OutgoingMessage<T>) {
  const dataToSend = typeof message.data === 'string' 
    ? message.data
    : JSON.stringify(message.data);
    
  const json = JSON.stringify({
    ...message,
    data: dataToSend,
  });

  console.log('Sending:\n', json);
  socket.send(json);
}
