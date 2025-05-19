import * as ws from 'ws';
import { IncomingMessage } from '../types/messages.js';
import { getGame, games } from '../db/gamesDb.js';
import { send } from '../utils/send.js';
import {
  applyAttack,
  isShipKilled,
  getSurroundingMisses,
  coordKey
} from '../utils/board.js';
import { increaseWins, getUserList } from '../db/usersDb.js';
import { broadcast } from '../utils/broadcast.js';

export function handleAttack(socket: ws.WebSocket, message: IncomingMessage) {
  const { gameId, x, y, indexPlayer } = message.data as {
    gameId: string;
    x: number;
    y: number;
    indexPlayer: string;
  };

  const game = getGame(gameId);
  if (!game || game.isFinished) return;

  const current = game.currentPlayerIndex;
  if (indexPlayer !== current) return;

  const enemyId = Object.keys(game.players).find((id) => id !== indexPlayer);
  if (!enemyId) return;

  const enemy = game.players[enemyId];
  const player = game.players[indexPlayer];

  const key = coordKey(x, y);
  if (player.moves.has(key)) return; // уже стрелял
  player.moves.add(key);

  const result = applyAttack(enemy.board, x, y);

  // отправляем обоим игрокам результат выстрела
  for (const user of [enemy, player]) {
    send(user.ws, {
      type: 'attack',
      data: {
        position: { x, y },
        currentPlayer: indexPlayer,
        status: result === 'hit' ? 'shot' : result,
      },
      id: 0,
    });
  }

  // проверка: убит корабль?
  if (result === 'hit') {
    const killedShip = enemy.ships.find((ship) =>
      isShipKilled(enemy.board, ship)
    );
    if (killedShip) {
      // обновляем клетки вокруг как miss
      const cells = getSurroundingMisses(killedShip);
      for (const [sx, sy] of cells) {
        const cell = enemy.board[sy][sx];
        if (cell.status === 'empty') {
          cell.status = 'miss';
          for (const user of [enemy, player]) {
            send(user.ws, {
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

      // повторный ход
      return;
    }
  }

  // проверка: победа
  const allShipsKilled = enemy.ships.every((ship) =>
    isShipKilled(enemy.board, ship)
  );

    if (allShipsKilled) {
    game.isFinished = true;

    // +1 победа игроку
    increaseWins(indexPlayer);

    // отправляем finish
    for (const id in game.players) {
        send(game.players[id].ws, {
        type: 'finish',
        data: {
            winPlayer: indexPlayer,
        },
        id: 0,
        });
    }

    // обновляем таблицу победителей
    broadcast({
        type: 'update_winners',
        data: getUserList(),
        id: 0,
    });

    // можно (опционально) удалить игру
    delete games[gameId];

    return;
    }

  // смена хода
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

  const tried = player.moves;

  let x = 0, y = 0;
  do {
    x = Math.floor(Math.random() * 10);
    y = Math.floor(Math.random() * 10);
  } while (tried.has(coordKey(x, y)));

  // перезапустить тот же хендлер, что и ручной выстрел
  handleAttack(socket, {
    type: 'attack',
    data: { gameId, x, y, indexPlayer },
    id: message.id,
  });
}
