import * as ws from 'ws';
import { IncomingMessage } from '../types/messages.js';
import { send } from '../utils/send.js';
import { broadcast } from '../utils/broadcast.js';
import {
  createRoom,
  addUserToRoom,
  getAvailableRooms,
  removeRoom,
} from '../db/roomsDb.js';
import { initGame, getGame } from '../db/gamesDb.js';
import { generateRandomShips } from '../utils/generateShips.js';
import { initBoardFromShips } from '../utils/board.js';
import { createBotSocket } from '../utils/botSocket.js';

export function handleCreateRoom(socket: ws.WebSocket, message: IncomingMessage) {
  const { name, index } = message.data as { name: string; index: string };
  const room = createRoom({ name, index, ws: socket });

  // special case: room against bot
  if (name === 'bot') {
    const botId = 'bot_' + Date.now();

    // создаём игру напрямую
    initGame(room.roomId, [
      [index, socket],
      [botId, null as unknown as ws.WebSocket], // временная заглушка, позже game.players[botId] перезаписывается полностью
    ]);

    // генерируем боту корабли и доску
    const botShips = generateRandomShips();
    const botBoard = initBoardFromShips(botShips);

    const game = getGame(room.roomId);
    if (game) {
      game.players[botId] = {
        ws: createBotSocket(index, room.roomId),
        ships: botShips,
        board: botBoard,
        moves: new Set(),
      };

      // рандомно определяем первого
      game.currentPlayerIndex = Math.random() < 0.5 ? index : botId;

      for (const id in game.players) {
        const player = game.players[id];
        send(player.ws, {
          type: 'start_game',
          data: {
            ships: player.ships,
            currentPlayerIndex: game.currentPlayerIndex,
          },
          id: 0,
        });

        send(player.ws, {
          type: 'turn',
          data: {
            currentPlayer: game.currentPlayerIndex,
          },
          id: 0,
        });
      }
    }

    return;
  }

  // обычный мультиплеер
  send(socket, {
    type: 'update_room',
    data: getAvailableRooms().map((r) => ({
      roomId: r.roomId,
      roomUsers: r.roomUsers.map(({ name, index }) => ({ name, index })),
    })),
    id: 0,
  });

  broadcastUpdateRoom();
}

export function handleAddUserToRoom(socket: ws.WebSocket, message: IncomingMessage) {
  const { name, index, indexRoom } = message.data as {
    name: string;
    index: string;
    indexRoom: string;
  };

  const room = addUserToRoom(indexRoom, { name, index, ws: socket });
  if (!room) {
    send(socket, {
      type: 'error',
      data: 'Room not found or already full',
      id: message.id,
    });
    return;
  }

  broadcastUpdateRoom();

  for (const user of room.roomUsers) {
    send(user.ws, {
      type: 'create_game',
      data: {
        idGame: room.roomId,
        idPlayer: user.index,
      },
      id: 0,
    });
  }
}

export function broadcastUpdateRoom() {
  broadcast({
    type: 'update_room',
    data: getAvailableRooms().map((r) => ({
      roomId: r.roomId,
      roomUsers: r.roomUsers.map(({ name, index }) => ({ name, index })),
    })),
    id: 0,
  });
}
