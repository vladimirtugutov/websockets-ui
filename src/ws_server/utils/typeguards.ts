export type AttackData = {
  x: number;
  y: number;
  gameId: string;
  indexPlayer: string;
};

export function isAttackData(obj: unknown): obj is AttackData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).x === 'number' &&
    typeof (obj as any).y === 'number' &&
    typeof (obj as any).gameId === 'string' &&
    typeof (obj as any).indexPlayer === 'string'
  );
}