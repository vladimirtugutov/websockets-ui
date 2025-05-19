import * as ws from 'ws';
import { IncomingMessage } from '../types/messages.js';
import { send } from '../utils/send.js';
import {
  addShips,
  getGame,
  isGameReady,
} from '../db/gamesDb.js';

export function handleAddShips(socket: ws.WebSocket, message: IncomingMessage) {
  const { gameId, indexPlayer, ships } = message.data as {
    gameId: string;
    indexPlayer: string;
    ships: any[];
  };

  const success = addShips(gameId, indexPlayer, ships);
  if (!success) {
    send(socket, {
      type: 'error',
      data: 'Game or player not found',
      id: message.id,
    });
    return;
  }

  if (!isGameReady(gameId)) return;

  const game = getGame(gameId);
  if (!game) return;

  const currentPlayer = game.currentPlayerIndex;

  for (const [id, player] of Object.entries(game.players)) {
    send(player.ws, {
      type: 'start_game',
      data: {
        ships: player.ships,
        currentPlayerIndex: currentPlayer,
      },
      id: 0,
    });

    send(player.ws, {
      type: 'turn',
      data: {
        currentPlayer,
      },
      id: 0,
    });
  }
}
