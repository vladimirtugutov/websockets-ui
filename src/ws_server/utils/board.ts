import { Ship } from '../db/gamesDb.js';

export type CellStatus = 'empty' | 'ship' | 'hit' | 'miss' | 'killed';

export type BoardCell = {
  x: number;
  y: number;
  status: CellStatus;
};

// 1. Создать пустую доску 10x10
export function createEmptyBoard(): BoardCell[][] {
  return Array.from({ length: 10 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) => ({
      x,
      y,
      status: 'empty' as CellStatus,
    }))
  );
}

// 2. Разместить корабли на доске
export function initBoardFromShips(ships: Ship[]): BoardCell[][] {
  const board = createEmptyBoard();

  for (const ship of ships) {
    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x + i : ship.position.x;
      const y = ship.direction ? ship.position.y : ship.position.y + i;

      board[y][x].status = 'ship';
    }
  }

  return board;
}

// 3. Преобразовать координаты в строку и обратно
export function coordKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseCoord(key: string): [number, number] {
  return key.split(',').map(Number) as [number, number];
}

// Проверка, убит ли весь корабль (все клетки = 'hit')
export function isShipKilled(board: BoardCell[][], ship: Ship): boolean {
  for (let i = 0; i < ship.length; i++) {
    const x = ship.direction ? ship.position.x + i : ship.position.x;
    const y = ship.direction ? ship.position.y : ship.position.y + i;
    if (board[y][x].status !== 'hit') return false;
  }
  return true;
}

// Пометить клетки вокруг убитого корабля как 'miss'
export function getSurroundingMisses(ship: Ship): [number, number][] {
  const coords: [number, number][] = [];

  for (let i = -1; i <= ship.length; i++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = ship.direction ? ship.position.x + i : ship.position.x + dx;
        const y = ship.direction ? ship.position.y + dy : ship.position.y + i;

        // исключаем клетки самого корабля
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

// Выполнить выстрел и вернуть статус
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

  return cell.status; // уже 'miss' или 'hit'
}
