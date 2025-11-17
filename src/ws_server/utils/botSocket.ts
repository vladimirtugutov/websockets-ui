import * as ws from 'ws';
import { handleRandomAttack } from '../handlers/game.js';
import { handleAddShips } from '../handlers/ships.js';
import { generateRandomShips } from './generateShips.js';
import { Ship } from '../types/game.js';

export function createBotSocket(botId: string, gameId: string): ws.WebSocket {
  let isGameStarted = false;

  const fake = {
    send: (msg: string) => {
      try {
        const message = JSON.parse(msg);

        if (message.type === 'create_game') {
          setTimeout(() => {
            let ships: Ship[] | undefined;
            let isValid = false;
            let attempts = 0;
            const maxAttempts = 20;

            while (!isValid && attempts < maxAttempts) {
              ships = generateRandomShips();
              attempts++;

              const taken = new Set<string>();
              let allValid = true;

              for (const ship of ships) {
                for (let i = 0; i < ship.length; i++) {
                  const x = ship.direction ? ship.position.x : ship.position.x + i;
                  const y = ship.direction ? ship.position.y + i : ship.position.y;

                  if (x < 0 || x >= 10 || y < 0 || y >= 10) {
                    allValid = false;
                    break;
                  }

                  const key = `${x},${y}`;
                  if (taken.has(key)) {
                    allValid = false;
                    break;
                  }
                  taken.add(key);
                }
                if (!allValid) break;
              }

              isValid = allValid && ships.length === 10;
            }

            if (isValid && ships) {
              const debugBoard: string[][] = Array.from({ length: 10 }, () => Array(10).fill('.'));

              for (const ship of ships) {
                for (let i = 0; i < ship.length; i++) {
                  const x = ship.direction ? ship.position.x : ship.position.x + i;
                  const y = ship.direction ? ship.position.y + i : ship.position.y;
                  debugBoard[y][x] = ship.type[0].toUpperCase();
                }
              }

              console.log('[Bot] Board layout after validation:');
              debugBoard.forEach((row, y) => {
                console.log(`Row ${y}: ${row.join(' ')}`);
              });

              handleAddShips(fake, {
                type: 'add_ships',
                id: 0,
                data: {
                  gameId,
                  ships,
                  indexPlayer: botId,
                },
              });
            } else {
              console.error(`[Bot] Failed to generate valid ships after ${maxAttempts} attempts`);
            }
          }, 500);
        }

        if (message.type === 'start_game') {
          isGameStarted = true;
          console.log('[Bot] Game started, ready to attack');
        }

        if (message.type === 'turn' && isGameStarted) {
          const data = JSON.parse(message.data);
          if (data.currentPlayer === botId) {
            console.log("[Bot] It's my turn, attacking...");
            setTimeout(() => {
              handleRandomAttack(fake, {
                type: 'randomAttack',
                id: 0,
                data: {
                  gameId,
                  indexPlayer: botId,
                },
              });
            }, 1000);
          }
        }
      } catch (e) {}
    },
    close: () => {},
    on: () => {},
    readyState: ws.WebSocket.OPEN,
  } as unknown as ws.WebSocket;

  return fake;
}
