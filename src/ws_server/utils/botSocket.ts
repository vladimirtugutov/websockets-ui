import * as ws from 'ws';
import { handleRandomAttack } from '../handlers/game.js';

export function createBotSocket(enemyId: string, gameId: string): ws.WebSocket {
  const fake = {
    send: () => {},
    close: () => {},
    on: () => {},
    readyState: ws.WebSocket.OPEN
  } as unknown as ws.WebSocket;

  setTimeout(() => {
    handleRandomAttack(fake, {
      type: 'randomAttack',
      id: 0,
      data: { gameId, indexPlayer: `bot_${gameId}` }
    });
  }, 1500);

  return fake;
}
