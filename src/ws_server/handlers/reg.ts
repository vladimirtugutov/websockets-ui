import * as ws from 'ws';
import { IncomingMessage, OutgoingMessage } from '../types/messages.js';
import {
  createUser,
  validateUser,
  getUserIndex,
  getUserList,
} from '../db/usersDb.js';
import { send } from '../utils/send.js';
import { broadcast } from '../utils/broadcast.js';

export function handleReg(socket: ws.WebSocket, message: IncomingMessage) {
  const { name, password } = message.data as { name: string; password: string };

  let error = false;
  let errorText = '';

  if (!name || !password) {
    error = true;
    errorText = 'Empty name or password';
  } else if (!validateUser(name, password)) {
    const created = createUser(name, password);
    if (!created) {
      error = true;
      errorText = 'Invalid password';
    }
  }

  const regResponse: OutgoingMessage = {
    type: 'reg',
    data: {
      name,
      index: getUserIndex(name),
      error,
      errorText,
    },
    id: message.id,
  };

  send(socket, regResponse);

  broadcast({
    type: 'update_room',
    data: [], // позже заменим на реальные комнаты
    id: 0,
  });

  broadcast({
    type: 'update_winners',
    data: getUserList(),
    id: 0,
  });
}
