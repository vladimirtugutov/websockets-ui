import * as ws from 'ws';
import { IncomingMessage } from '../types/messages.js';
import { send } from '../utils/send.js';
import { broadcast } from '../utils/broadcast.js';
import {
  createRoom,
  addUserToRoom,
  getAvailableRooms,
  type Room,
  type RoomUser,
} from '../db/roomsDb.js';
import { initGame, getGame, socketToGamePlayer } from '../db/gamesDb.js';
import { generateRandomShips } from '../utils/generateShips.js';
import { initBoardFromShips } from '../utils/board.js';
import { createBotSocket } from '../utils/botSocket.js';
import { getUserIndexFromSocket, getUserList } from '../db/usersDb.js';
import { handleAddShips } from '../handlers/ships.js';

export function handleCreateRoom(socket: ws.WebSocket, message: IncomingMessage) {
  const index = getUserIndexFromSocket(socket);
  if (!index) {
    send(socket, {
      type: 'error',
      data: 'User not registered',
      id: message.id,
    });
    return;
  }

  const name = index;
  const room = createRoom({ name, index, ws: socket });
  console.log('Created room:', room);

  const data = message.data as { name?: string };
  if (data.name === 'bot') {
    const botId = 'bot_' + Date.now();

    initGame(room.roomId, [
      [index, socket],
      [botId, null as unknown as ws.WebSocket],
    ]);

    const botShips = generateRandomShips();
    const botBoard = initBoardFromShips(botShips);

    const game = getGame(room.roomId);
    if (game) {
      game.players[botId] = {
        ws: createBotSocket(botId, room.roomId),
        ships: botShips,
        board: botBoard,
        moves: new Set(),
      };

      game.currentPlayerIndex = Math.random() < 0.5 ? index : botId;

      const player = game.players[index];
      player.ships = generateRandomShips();
      player.board = initBoardFromShips(player.ships);

      handleAddShips(player.ws, {
        type: 'add_ships',
        id: 0,
        data: {
          ships: player.ships,
          indexPlayer: index,
          gameId: room.roomId,
        },
      });

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

  broadcastUpdateRoom();
}

export function handleAddUserToRoom(socket: ws.WebSocket, message: IncomingMessage) {
  const index = getUserIndexFromSocket(socket);
  if (!index) {
    send(socket, {
      type: 'error',
      data: 'User not registered',
      id: message.id,
    });
    return;
  }

  const name = index;
  let data = message.data;

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.error('Invalid JSON in addUserToRoom');
      send(socket, {
        type: 'error',
        data: 'Invalid JSON',
        id: message.id,
      });
      return;
    }
  }

  const { indexRoom } = data as { indexRoom: string };
  const room = addUserToRoom(indexRoom, { name, index, ws: socket });

  if (!room) {
    send(socket, {
      type: 'error',
      data: 'Room not found or already full',
      id: message.id,
    });
    return;
  }

  if (room.roomUsers.length === 2) {
    console.log('[handleAddUserToRoom] Starting initGame');
    const gameId = room.roomId;

    initGame(
      gameId,
      room.roomUsers.map((u) => [u.index, u.ws])
    );

    const playerIds = room.roomUsers.map((u) => u.index);
    const currentPlayer = playerIds[Math.floor(Math.random() * playerIds.length)];
    const game = getGame(gameId);
    if (game) {
      game.currentPlayerIndex = currentPlayer;
      console.log(`[handleAddUserToRoom] Selected first player: ${currentPlayer}`);
    }

    for (const u of room.roomUsers) {
      socketToGamePlayer.set(u.ws, {
        gameId,
        playerId: u.index,
      });
    }
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

export function handleSinglePlay(socket: ws.WebSocket, message: IncomingMessage) {
  const userIndex = getUserIndexFromSocket(socket);
  if (!userIndex) return;

  const humanUser: RoomUser = {
    name: userIndex,
    index: userIndex,
    ws: socket,
  };

  const room = createRoom(humanUser);
  const gameId = room.roomId;

  console.log('Created single-player room:', { roomId: room.roomId, user: userIndex });

  const botId = `bot_${Date.now()}`;
  const botSocket = createBotSocket(botId, gameId);

  initGame(gameId, [
    [userIndex, socket],
    [botId, botSocket],
  ]);

  socketToGamePlayer.set(socket, { gameId, playerId: userIndex });
  socketToGamePlayer.set(botSocket, { gameId, playerId: botId });

  console.log('[handleSinglePlay] Game initialized:', { gameId, humanId: userIndex, botId });

  send(socket, {
    type: 'create_game',
    data: { idGame: gameId, idPlayer: userIndex },
    id: 0,
  });

  send(botSocket, {
    type: 'create_game',
    data: { idGame: gameId, idPlayer: botId },
    id: 0,
  });
}
