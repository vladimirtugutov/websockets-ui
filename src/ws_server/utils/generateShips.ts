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
  const reserved = new Set<string>();

  for (const [length, count] of sizes) {
    for (let c = 0; c < count; c++) {
      let placed = false;
      let maxAttempts = 1000;

      while (!placed && maxAttempts-- > 0) {
        const direction = Math.random() < 0.5;

        const x = Math.floor(Math.random() * (direction ? 10 : 10 - length));
        const y = Math.floor(Math.random() * (direction ? 10 - length : 10));

        const coords: [number, number][] = [];
        const allCells: [number, number][] = [];

        for (let i = 0; i < length; i++) {
          const cx = direction ? x : x + i;
          const cy = direction ? y + i : y;
          coords.push([cx, cy]);
        }

        for (const [cx, cy] of coords) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
                allCells.push([nx, ny]);
              }
            }
          }
        }

        const canPlace = coords.every(([cx, cy]) => !reserved.has(`${cx},${cy}`));

        if (canPlace) {
          coords.forEach(([cx, cy]) => taken.add(`${cx},${cy}`));

          allCells.forEach(([cx, cy]) => reserved.add(`${cx},${cy}`));

          ships.push({
            type:
              length === 1 ? 'small' : length === 2 ? 'medium' : length === 3 ? 'large' : 'huge',
            length,
            direction,
            position: { x, y },
          });
          placed = true;
        }
      }

      if (!placed) {
        console.error(`Failed to place ship of length ${length}`);
      }
    }
  }

  return ships;
}
