import { Ship } from '../types/game.js';

export function generateRandomShips(): Ship[] {
  const ships: Ship[] = [];

  const sizes: [number, number][] = [
    [4, 1], // 1x4
    [3, 2], // 2x3
    [2, 3], // 3x2
    [1, 4], // 4x1
  ];

  const taken = new Set<string>();

  for (const [length, count] of sizes) {
    for (let c = 0; c < count; c++) {
      let placed = false;

      while (!placed) {
        const direction = Math.random() < 0.5;
        const x = Math.floor(Math.random() * (direction ? 10 - length : 10));
        const y = Math.floor(Math.random() * (direction ? 10 : 10 - length));

        const coords = Array.from({ length }, (_, i) =>
          `${direction ? x + i : x},${direction ? y : y + i}`
        );

        if (coords.every((c) => !taken.has(c))) {
          coords.forEach((c) => taken.add(c));
          ships.push({
            type: (
                length === 1 ? 'small' :
                length === 2 ? 'medium' :
                length === 3 ? 'large' :
                'huge'
            ),
            length,
            direction,
            position: { x, y },
          });
          placed = true;
        }
      }
    }
  }

  return ships;
}
