import { Ship, BoardCell, CellStatus } from '../types/game.js';

export function createEmptyBoard(): BoardCell[][] {
  return Array.from({ length: 10 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) => ({
      x,
      y,
      status: 'empty' as CellStatus,
    }))
  );
}

export function initBoardFromShips(ships: Ship[]): BoardCell[][] {
  const board = createEmptyBoard();

  for (const ship of ships) {
    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x : ship.position.x + i;
      const y = ship.direction ? ship.position.y + i : ship.position.y;

      if (x >= 0 && x < 10 && y >= 0 && y < 10) {
        board[y][x].status = 'ship';
      } else {
        console.error(`[initBoardFromShips] Ship out of bounds at (${x}, ${y}):`, ship);
      }
    }
  }

  return board;
}


export function coordKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseCoord(key: string): [number, number] {
  return key.split(',').map(Number) as [number, number];
}

export function isShipKilled(board: BoardCell[][], ship: Ship): boolean {
  for (let i = 0; i < ship.length; i++) {
    const x = ship.direction ? ship.position.x : ship.position.x + i;
    const y = ship.direction ? ship.position.y + i : ship.position.y;
    if (board[y][x].status !== 'hit') return false;
  }
  return true;
}

export function getSurroundingMisses(ship: Ship): [number, number][] {
  const coords: [number, number][] = [];

  for (let i = -1; i <= ship.length; i++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = ship.direction ? ship.position.x + dx : ship.position.x + i;
        const y = ship.direction ? ship.position.y + i : ship.position.y + dy;

        if (
          i >= 0 &&
          i < ship.length &&
          dx === 0 &&
          dy === 0
        ) continue;

        if (x >= 0 && x < 10 && y >= 0 && y < 10) {
          coords.push([x, y]);
        }
      }
    }
  }

  return coords;
}

export function applyAttack(board: BoardCell[][], x: number, y: number): CellStatus {
  const cell = board[y][x];

  if (cell.status === 'ship') {
    cell.status = 'hit';
    return 'hit';
  }

  if (cell.status === 'empty') {
    cell.status = 'miss';
    return 'miss';
  }

  return cell.status;
}
