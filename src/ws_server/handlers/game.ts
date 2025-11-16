import * as ws from 'ws';
import { IncomingMessage } from '../types/messages.js';
import { getGame, games } from '../db/gamesDb.js';
import { send } from '../utils/send.js';
import { applyAttack, isShipKilled, getSurroundingMisses, coordKey } from '../utils/board.js';
import { increaseWins, getUserList } from '../db/usersDb.js';
import { broadcast } from '../utils/broadcast.js';
import { isAttackData } from '../utils/typeguards.js';

export function handleAttack(socket: ws.WebSocket, message: IncomingMessage) {
  const data = message.data;

  if (!isAttackData(data)) {
    console.error('[handleAttack] Invalid message format:', message);
    send(socket, {
      type: 'error',
      data: 'Invalid message format',
      id: message.id,
    });
    return;
  }

  const { x, y, gameId, indexPlayer } = data;

  console.log('[handleAttack] Received attack:', { x, y, gameId, indexPlayer });

  const game = getGame(gameId);
  if (!game || game.isFinished) return;

  if (indexPlayer !== game.currentPlayerIndex) {
    console.warn(
      `[handleAttack] Not player's turn. Current: ${game.currentPlayerIndex}, Attempted: ${indexPlayer}`
    );
    return;
  }

  const enemyId = Object.keys(game.players).find((id) => id !== indexPlayer);
  if (!enemyId) return;

  const player = game.players[indexPlayer];
  const enemy = game.players[enemyId];

  const key = coordKey(x, y);
  if (player.moves.has(key)) return;
  player.moves.add(key);

  console.log(`[handleAttack] Cell at (${x},${y}) status BEFORE: ${enemy.board[y][x].status}`);

  const result = applyAttack(enemy.board, x, y);

  console.log(`[handleAttack] Attack result: ${result}`);
  console.log(`[handleAttack] Cell at (${x},${y}) status AFTER: ${enemy.board[y][x].status}`);

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

  if (result === 'hit') {
    console.log(`[handleAttack] Checking all ships for kill status...`);

    let newlyKilledShip = null;

    for (const ship of enemy.ships) {
      let containsCell = false;
      for (let i = 0; i < ship.length; i++) {
        const sx = ship.direction ? ship.position.x : ship.position.x + i;
        const sy = ship.direction ? ship.position.y + i : ship.position.y;
        if (sx === x && sy === y) {
          containsCell = true;
          break;
        }
      }

      if (containsCell && isShipKilled(enemy.board, ship)) {
        newlyKilledShip = ship;
        break;
      }
    }

    if (newlyKilledShip) {
      console.log(`[handleAttack] FOUND NEWLY KILLED SHIP:`, newlyKilledShip);
      const cells = getSurroundingMisses(newlyKilledShip);
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

      const allShipsKilled = enemy.ships.every((ship) => isShipKilled(enemy.board, ship));

      if (allShipsKilled) {
        game.isFinished = true;
        increaseWins(indexPlayer);

        for (const id in game.players) {
          send(game.players[id].ws, {
            type: 'finish',
            data: { winPlayer: indexPlayer },
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

      for (const id in game.players) {
        send(game.players[id].ws, {
          type: 'turn',
          data: { currentPlayer: indexPlayer },
          id: 0,
        });
      }
      return;
    }

    for (const id in game.players) {
      send(game.players[id].ws, {
        type: 'turn',
        data: { currentPlayer: indexPlayer },
        id: 0,
      });
    }
    return;
  }

  const allShipsKilled = enemy.ships.every((ship) => isShipKilled(enemy.board, ship));

  if (allShipsKilled) {
    game.isFinished = true;
    increaseWins(indexPlayer);

    for (const id in game.players) {
      send(game.players[id].ws, {
        type: 'finish',
        data: { winPlayer: indexPlayer },
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

  let x = 0,
    y = 0;
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
