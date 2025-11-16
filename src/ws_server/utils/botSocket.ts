import * as ws from 'ws';
import { handleRandomAttack } from '../handlers/game.js';

export function createBotSocket(botId: string, gameId: string): ws.WebSocket {
  const fake = {
    send: (msg: string) => {
      console.log('Bot received message (fake send):', msg);
    },
    close: () => {},
    on: () => {},
    readyState: ws.WebSocket.OPEN,
  } as unknown as ws.WebSocket;

  setTimeout(() => {
    handleRandomAttack(fake, {
      type: 'randomAttack',
      id: 0,
      data: {
        gameId,
        indexPlayer: botId,
      },
    });
  }, 1500);

  return fake;
}
