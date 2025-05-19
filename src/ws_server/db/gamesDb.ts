import * as ws from 'ws';

export type Ship = {
  position: { x: number; y: number };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
};

type CellStatus = 'empty' | 'ship' | 'hit' | 'miss' | 'killed';

type BoardCell = {
  x: number;
  y: number;
  status: CellStatus;
};

type PlayerState = {
  ws: ws.WebSocket;
  ships: Ship[];
  board: BoardCell[][]; // 10x10
  moves: Set<string>; // x,y координаты выстрелов
};

type GameState = {
  gameId: string;
  players: Record<string, PlayerState>;
  currentPlayerIndex: string;
  isFinished: boolean;
};

export const games: Record<string, GameState> = {};

export function initGame(gameId: string, players: [string, ws.WebSocket][]) {
  const gamePlayers: Record<string, PlayerState> = {};

  for (const [playerId, socket] of players) {
    gamePlayers[playerId] = {
      ws: socket,
      ships: [],
      board: [],      // заполним позже
      moves: new Set()
    };
  }

  games[gameId] = {
    gameId,
    players: gamePlayers,
    currentPlayerIndex: '',
    isFinished: false
  };
}

export function addPlayerToGame(gameId: string, playerId: string, socket: ws.WebSocket) {
  if (!games[gameId]) return;
  games[gameId].players[playerId] = {
    ws: socket,
    ships: [],
    board: [],
    moves: new Set()
  };
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
