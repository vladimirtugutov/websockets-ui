import * as ws from 'ws';

type UserData = {
  password: string;
  wins: number;
};

const users: Record<string, UserData> = {};

const socketToUserMap = new Map<ws.WebSocket, string>();

export function bindSocketToUser(socket: ws.WebSocket, name: string) {
  socketToUserMap.set(socket, name);
}

export function getUserIndexFromSocket(socket: ws.WebSocket): string | undefined {
  const name = socketToUserMap.get(socket);
  return name ? getUserIndex(name) : undefined;
}

export function createUser(name: string, password: string): boolean {
  if (users[name]) return false;
  users[name] = { password, wins: 0 };
  return true;
}

export function validateUser(name: string, password: string): boolean {
  return !!users[name] && users[name].password === password;
}

export function getUserList() {
  return Object.entries(users).map(([name, data]) => ({
    name,
    wins: data.wins,
  }));
}

export function getUserIndex(name: string): string {
  return name;
}

export function increaseWins(name: string) {
  if (users[name]) users[name].wins++;
}
