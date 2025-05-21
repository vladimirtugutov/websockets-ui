import * as ws from 'ws';
import { IncomingMessage } from '../types/messages.js';
import { getGame, games } from '../db/gamesDb.js';
import { send } from '../utils/send.js';
import {
  applyAttack,
  isShipKilled,
  getSurroundingMisses,
  coordKey,
} from '../utils/board.js';
import { increaseWins, getUserList } from '../db/usersDb.js';
import { broadcast } from '../utils/broadcast.js';

type AttackData = {
  x: number;
  y: number;
  gameId: string;
  indexPlayer: string;
};

export function handleAttack(socket: ws.WebSocket, message: IncomingMessage) {
  let raw = message.data;
  let data: AttackData;

  // 🔍 Попробуем распарсить JSON-строку
  try {
    if (typeof raw === 'string') {
      data = JSON.parse(raw) as AttackData;
    } else {
      data = raw as AttackData;
    }
  } catch (err) {
    console.error('[handleAttack] ❌ Failed to parse message.data:', raw);
    send(socket, {
      type: 'error',
      data: 'Invalid JSON in attack',
      id: message.id,
    });
    return;
  }

  // 🧱 Валидация типов
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof data.x !== 'number' ||
    typeof data.y !== 'number' ||
    typeof data.gameId !== 'string' ||
    typeof data.indexPlayer !== 'string'
  ) {
    console.error('[handleAttack] ❌ Invalid message format:', message);
    send(socket, {
      type: 'error',
      data: 'Invalid message format',
      id: message.id,
    });
    return;
  }

  const { gameId, x, y, indexPlayer } = data;

  console.log('[handleAttack] ✅ Received attack:', { gameId, x, y, indexPlayer });

  const game = getGame(gameId);
  if (!game || game.isFinished) {
    console.warn('[handleAttack] ⚠️ Game not found or already finished:', gameId);
    return;
  }

  if (indexPlayer !== game.currentPlayerIndex) {
    console.warn('[handleAttack] ⛔ Not this player\'s turn:', indexPlayer);
    return;
  }

  const enemyId = Object.keys(game.players).find((id) => id !== indexPlayer);
  if (!enemyId) return;

  const player = game.players[indexPlayer];
  const enemy = game.players[enemyId];

  const key = coordKey(x, y);
  if (player.moves.has(key)) return;

  player.moves.add(key);
  const result = applyAttack(enemy.board, x, y);

  // 🎯 отправим результат обеим сторонам
  for (const p of [player, enemy]) {
    send(p.ws, {
      type: 'attack',
      data: {
        position: { x, y },
        currentPlayer: indexPlayer,
        status: result === 'hit' ? 'shot' : result,
      },
      id: 0,
    });
  }

  // 💀 проверка на убийство
  if (result === 'hit') {
    const killedShip = enemy.ships.find((ship) =>
      isShipKilled(enemy.board, ship)
    );

    if (killedShip) {
      const cells = getSurroundingMisses(killedShip);
      for (const [sx, sy] of cells) {
        if (enemy.board[sy][sx].status === 'empty') {
          enemy.board[sy][sx].status = 'miss';
          for (const p of [player, enemy]) {
            send(p.ws, {
              type: 'attack',
              data: {
                position: { x: sx, y: sy },
                currentPlayer: indexPlayer,
                status: 'miss',
              },
              id: 0,
            });
          }
        }
      }
      return; // 🎯 игрок ходит снова
    }
  }

  const allShipsKilled = enemy.ships.every((ship) =>
    isShipKilled(enemy.board, ship)
  );

  if (allShipsKilled) {
    game.isFinished = true;
    increaseWins(indexPlayer);

    for (const id in game.players) {
      send(game.players[id].ws, {
        type: 'finish',
        data: {
          winPlayer: indexPlayer,
        },
        id: 0,
      });
    }

    broadcast({
      type: 'update_winners',
      data: getUserList(),
      id: 0,
    });

    delete games[gameId];
    return;
  }

  game.currentPlayerIndex = enemyId;
  for (const id in game.players) {
    send(game.players[id].ws, {
      type: 'turn',
      data: {
        currentPlayer: enemyId,
      },
      id: 0,
    });
  }
}

export function handleRandomAttack(socket: ws.WebSocket, message: IncomingMessage) {
  const { gameId, indexPlayer } = message.data as {
    gameId: string;
    indexPlayer: string;
  };

  const game = getGame(gameId);
  if (!game || game.isFinished) return;

  const player = game.players[indexPlayer];
  const enemyId = Object.keys(game.players).find((id) => id !== indexPlayer);
  if (!enemyId) return;

  const enemy = game.players[enemyId];
  if (!enemy?.board) return;

  const tried = player.moves;

  let x = 0, y = 0;
  const maxX = enemy.board[0]?.length || 10;
  const maxY = enemy.board.length || 10;

  let attempts = 0;
  do {
    x = Math.floor(Math.random() * maxX);
    y = Math.floor(Math.random() * maxY);
    attempts++;
    if (attempts > 100) {
      console.warn('Bot failed to find valid attack position');
      return;
    }
  } while (tried.has(coordKey(x, y)));

  handleAttack(socket, {
    type: 'attack',
    data: { gameId, x, y, indexPlayer },
    id: message.id,
  });
}
