import * as ws from 'ws';

export type Ship = {
  position: { x: number; y: number };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
};

type GameState = {
  gameId: string;
  players: Record<string, { ws: ws.WebSocket; ships?: Ship[] }>;
  currentPlayerIndex: string | null;
};

const games: Record<string, GameState> = {};

export function initGame(gameId: string, players: [string, ws.WebSocket]) {
  games[gameId] = {
    gameId,
    players: {
      [players[0]]: { ws: players[1] },
    },
    currentPlayerIndex: null,
  };
}

export function addPlayerToGame(gameId: string, playerId: string, socket: ws.WebSocket) {
  if (!games[gameId]) return;
  games[gameId].players[playerId] = { ws: socket };
}

export function addShips(gameId: string, playerId: string, ships: Ship[]): boolean {
  const game = games[gameId];
  if (!game) return false;

  game.players[playerId].ships = ships;

  const bothReady = Object.values(game.players).every((p) => p.ships);
  if (bothReady) {
    // выбираем случайного первого игрока
    const playerIds = Object.keys(game.players);
    const currentPlayerIndex = playerIds[Math.floor(Math.random() * playerIds.length)];
    game.currentPlayerIndex = currentPlayerIndex;
  }

  return true;
}

export function isGameReady(gameId: string): boolean {
  const game = games[gameId];
  return !!game && Object.values(game.players).every((p) => p.ships);
}

export function getGame(gameId: string): GameState | undefined {
  return games[gameId];
}
