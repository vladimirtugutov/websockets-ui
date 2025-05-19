import * as ws from 'ws';
import { IncomingMessage } from '../types/messages.js';
import { send } from '../utils/send.js';
import { broadcast } from '../utils/broadcast.js';
import {
  createRoom,
  addUserToRoom,
  getAvailableRooms,
  removeRoom,
} from '../db/roomsDb.js';

export function handleCreateRoom(socket: ws.WebSocket, message: IncomingMessage) {
  const { name, index } = message.data as { name: string; index: string };
  const room = createRoom({ name, index, ws: socket });

  send(socket, {
    type: 'update_room',
    data: getAvailableRooms().map((r) => ({
      roomId: r.roomId,
      roomUsers: r.roomUsers.map(({ name, index }) => ({ name, index })),
    })),
    id: 0,
  });

  broadcastUpdateRoom();
}

export function handleAddUserToRoom(socket: ws.WebSocket, message: IncomingMessage) {
  const { name, index, indexRoom } = message.data as {
    name: string;
    index: string;
    indexRoom: string;
  };

  const room = addUserToRoom(indexRoom, { name, index, ws: socket });
  if (!room) {
    send(socket, {
      type: 'error',
      data: 'Room not found or already full',
      id: message.id,
    });
    return;
  }

  broadcastUpdateRoom();

  for (const user of room.roomUsers) {
    send(user.ws, {
      type: 'create_game',
      data: {
        idGame: room.roomId,
        idPlayer: user.index,
      },
      id: 0,
    });
  }
}

export function broadcastUpdateRoom() {
  broadcast({
    type: 'update_room',
    data: getAvailableRooms().map((r) => ({
      roomId: r.roomId,
      roomUsers: r.roomUsers.map(({ name, index }) => ({ name, index })),
    })),
    id: 0,
  });
}
