import * as ws from 'ws';
import { IncomingMessage } from '../types/messages.js';
import { send } from '../utils/send.js';
import { broadcast } from '../utils/broadcast.js';
import {
  createUser,
  validateUser,
  getUserIndex,
  getUserList,
  bindSocketToUser,
  isUserLoggedIn,
} from '../db/usersDb.js';
import { getAvailableRooms } from '../db/roomsDb.js';

export function handleReg(socket: ws.WebSocket, message: IncomingMessage) {
  let data = message.data;

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.error('Invalid JSON string in message.data:', data);
      send(socket, {
        type: 'error',
        data: 'Invalid JSON',
        id: message.id,
      });
      return;
    }
  }

  const { name, password } = data as { name: string; password: string };

  let error = false;
  let errorText = '';

  if (!name || !password) {
    error = true;
    errorText = 'Empty name or password';
  } else if (isUserLoggedIn(name)) {
    error = true;
    errorText = 'User is already logged in';
  } else if (!validateUser(name, password)) {
    const created = createUser(name, password);
    if (!created) {
      error = true;
      errorText = 'Invalid password';
    }
  }

  const regResponse = {
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

  if (!error) {
    bindSocketToUser(socket, name);

    broadcast({
      type: 'update_room',
      data: getAvailableRooms(),
      id: 0,
    });

    broadcast({
      type: 'update_winners',
      data: getUserList(),
      id: 0,
    });
  }
}
