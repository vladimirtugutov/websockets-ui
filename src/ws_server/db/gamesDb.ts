import * as ws from 'ws';
import { Ship, BoardCell } from '../types/game.js';

type PlayerState = {
  ws: ws.WebSocket;
  ships: Ship[];
  board: BoardCell[][];
  moves: Set<string>;
};

type GameState = {
  gameId: string;
  players: Record<string, PlayerState>;
  currentPlayerIndex: string;
  isFinished: boolean;
};

export const games: Record<string, GameState> = {};

export const socketToGamePlayer = new Map<ws.WebSocket, { gameId: string; playerId: string }>();

export function initGame(gameId: string, players: [string, ws.WebSocket][]) {
  const gamePlayers: Record<string, PlayerState> = {};

  for (const [playerId, socket] of players) {
    gamePlayers[playerId] = {
      ws: socket,
      ships: [],
      board: [],
      moves: new Set(),
    };
  }

  games[gameId] = {
    gameId,
    players: gamePlayers,
    currentPlayerIndex: '',
    isFinished: false,
  };
}

export function addPlayerToGame(gameId: string, playerId: string, socket: ws.WebSocket) {
  if (!games[gameId]) return;
  games[gameId].players[playerId] = {
    ws: socket,
    ships: [],
    board: [],
    moves: new Set(),
  };
}

export function addShips(gameId: string, playerId: string, ships: Ship[]): boolean {
  const game = games[gameId];
  if (!game) return false;
  if (!game.players[playerId]) return false;

  game.players[playerId].ships = ships;

  const board: BoardCell[][] = [];
  for (let y = 0; y < 10; y++) {
    board[y] = [];
    for (let x = 0; x < 10; x++) {
      board[y][x] = { x, y, status: 'empty' };
    }
  }

  for (const ship of ships) {
    const dx = ship.direction ? 0 : 1;
    const dy = ship.direction ? 1 : 0;

    for (let i = 0; i < ship.length; i++) {
      const x = ship.position.x + i * dx;
      const y = ship.position.y + i * dy;

      if (x >= 0 && x < 10 && y >= 0 && y < 10) {
        board[y][x].status = 'ship';
      }
    }
  }

  game.players[playerId].board = board;

  const allPlayersReady = Object.values(game.players).every((p) => p.ships.length > 0);

  if (allPlayersReady && !game.currentPlayerIndex) {
    const playerIds = Object.keys(game.players);
    game.currentPlayerIndex = playerIds[0];
  }

  return true;
}

export function getGame(gameId: string): GameState | undefined {
  return games[gameId];
}
