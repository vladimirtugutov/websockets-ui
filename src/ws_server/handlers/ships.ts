import * as ws from 'ws';
import { IncomingMessage } from '../types/messages.js';
import { send } from '../utils/send.js';
import {
  addShips,
  getGame,
  isGameReady,
  Ship,
  socketToGamePlayer,
} from '../db/gamesDb.js';

export function handleAddShips(socket: ws.WebSocket, message: IncomingMessage) {
  const entry = socketToGamePlayer.get(socket);

  if (!entry) {
    console.warn('[handleAddShips] socket not found in socketToGamePlayer');
    send(socket, {
      type: 'error',
      data: 'Unknown game or player',
      id: message.id,
    });
    return;
  }

  const { gameId, playerId } = entry;
  console.log('[handleAddShips] Inferred:', { gameId, playerId });

  let data = message.data;

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.error('[handleAddShips] Invalid JSON:', data);
      send(socket, {
        type: 'error',
        data: 'Invalid JSON in add_ships',
        id: message.id,
      });
      return;
    }
  }

  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray((data as any).ships)
  ) {
    console.warn('[handleAddShips] Invalid message format:', data);
    send(socket, {
      type: 'error',
      data: 'Invalid message format',
      id: message.id,
    });
    return;
  }

  const { ships } = data as { ships: Ship[] };

  const success = addShips(gameId, playerId, ships);
  if (!success) {
    console.warn(`[handleAddShips] Failed to add ships for player ${playerId} in game ${gameId}`);
    send(socket, {
      type: 'error',
      data: 'Game or player not found',
      id: message.id,
    });
    return;
  }

  console.log(`[handleAddShips] Ships set for player ${playerId} in game ${gameId}`);

  const game = getGame(gameId);
  if (!game) {
    console.error(`[handleAddShips] Game not found after adding ships: ${gameId}`);
    return;
  }

  if (!isGameReady(gameId)) {
    console.log(`[handleAddShips] Game ${gameId} not ready yet`);
    return;
  }

  const currentPlayer = game.currentPlayerIndex;
  console.log(`[handleAddShips] Game ${gameId} is ready. Current player: ${currentPlayer}`);

  for (const [id, player] of Object.entries(game.players)) {
    console.log(`[handleAddShips] Sending start_game to ${id} — currentPlayerIndex: ${currentPlayer}`);

    send(player.ws, {
      type: 'start_game',
      data: {
        ships: player.ships,
        currentPlayerIndex: currentPlayer,
        playerId: id,
      },
      id: 0,
    });

    console.log(`[handleAddShips] Sending turn info to ${id} — currentPlayer: ${currentPlayer}`);

    send(player.ws, {
      type: 'turn',
      data: {
        currentPlayer,
      },
      id: 0,
    });
  }
}
