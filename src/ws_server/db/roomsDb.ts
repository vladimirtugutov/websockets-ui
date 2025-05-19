import * as ws from 'ws';

export type RoomUser = {
  name: string;
  index: string;
  ws: ws.WebSocket;
};

export type Room = {
  roomId: string;
  roomUsers: RoomUser[];
};

const rooms: Room[] = [];
let roomCounter = 1;

export function createRoom(user: RoomUser): Room {
  const roomId = String(roomCounter++);
  const room: Room = {
    roomId,
    roomUsers: [user],
  };
  rooms.push(room);
  return room;
}

export function addUserToRoom(roomId: string, user: RoomUser): Room | null {
  const room = rooms.find((r) => r.roomId === roomId);
  if (!room || room.roomUsers.length >= 2) return null;

  room.roomUsers.push(user);
  return room;
}

export function getAvailableRooms(): Room[] {
  return rooms.filter((r) => r.roomUsers.length === 1);
}

export function removeRoom(roomId: string) {
  const index = rooms.findIndex((r) => r.roomId === roomId);
  if (index !== -1) rooms.splice(index, 1);
}
