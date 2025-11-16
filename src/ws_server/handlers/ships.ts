import * as ws from 'ws';
import { IncomingMessage } from '../types/messages.js';
import { send } from '../utils/send.js';
import { Ship } from '../types/game.js';
import {
  addShips,
  getGame,
  socketToGamePlayer,
} from '../db/gamesDb.js';

function validateShips(ships: Ship[]): boolean {
  const taken = new Set<string>();
  
  for (const ship of ships) {
    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x : ship.position.x + i;
      const y = ship.direction ? ship.position.y + i : ship.position.y;
      
      if (x < 0 || x >= 10 || y < 0 || y >= 10) {
        console.error(`[validateShips] Ship out of bounds:`, ship);
        return false;
      }
      
      const key = `${x},${y}`;
      if (taken.has(key)) {
        console.error(`[validateShips] Ships overlap at (${x},${y})`);
        return false;
      }
      taken.add(key);
    }
  }
  
  return ships.length === 10;
}

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

  while (typeof data === 'string') {
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

  if (!data || typeof data !== 'object' || !Array.isArray((data as { ships?: unknown[] }).ships)) {
    console.warn('[handleAddShips] Invalid message format after parsing:', data);
    send(socket, {
      type: 'error',
      data: 'Invalid message format',
      id: message.id,
    });
    return;
  }

  const { ships } = data as { ships: Ship[] };

  if (!validateShips(ships)) {
  console.warn('[handleAddShips] Invalid ships configuration');
  send(socket, {
    type: 'error',
    data: 'Invalid ships placement',
    id: message.id,
  });
  return;
}

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

  const allPlayersReady = Object.values(game.players).every(p => p.ships.length > 0);

  if (!allPlayersReady) {
    console.log(`[handleAddShips] Game ${gameId} not ready yet - waiting for other player`);
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
