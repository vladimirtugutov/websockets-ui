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

export const socketToGamePlayer = new Map<ws.WebSocket, { gameId: string; playerId: string }>();

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

function createEmptyBoard(): BoardCell[][] {
    const board: BoardCell[][] = [];
    for (let y = 0; y < 10; y++) {
        board[y] = [];
        for (let x = 0; x < 10; x++) {
            board[y][x] = { x, y, status: 'empty' };
        }
    }
    return board;
}

export function addShips(gameId: string, playerId: string, ships: Ship[]): boolean {
  const game = games[gameId];
  if (!game) {
    console.log(`[addShips] Game ${gameId} not found`);
    return false;
  }

  if (!game.players[playerId]) {
    console.log(`[addShips] Player ${playerId} not found in game ${gameId}`);
    return false;
  }
  game.players[playerId].ships = ships;
  
  const board = createEmptyBoard();
  
  for (const ship of ships) {
    const { x: startX, y: startY } = ship.position;
    const dx = ship.direction ? 1 : 0;
    const dy = ship.direction ? 0 : 1;
    
    for (let i = 0; i < ship.length; i++) {
      const x = startX + i * dx;
      const y = startY + i * dy;
      
      if (y >= 0 && y < 10 && x >= 0 && x < 10) {
        board[y][x].status = 'ship';
      }
    }
  }
  
  game.players[playerId].board = board;
  console.log(`[addShips] Ships set and board created for player ${playerId} in game ${gameId}`);
  
  const allPlayersReady = Object.values(game.players).every(p => p.ships.length > 0);
  
  if (allPlayersReady && !game.currentPlayerIndex) {
    const playerIds = Object.keys(game.players);
    game.currentPlayerIndex = playerIds[0];
    console.log(`[addShips] Game ${gameId} ready! First turn: ${game.currentPlayerIndex}`);
  }

  return true;
}

export function getGame(gameId: string): GameState | undefined {
  return games[gameId];
}
