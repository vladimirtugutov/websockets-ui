export type AttackData = {
  x: number;
  y: number;
  gameId: string;
  indexPlayer: string;
};

export function isAttackData(obj: unknown): obj is AttackData {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const data = obj as Record<string, unknown>;
  
  return (
    typeof data.x === 'number' &&
    typeof data.y === 'number' &&
    typeof data.gameId === 'string' &&
    typeof data.indexPlayer === 'string'
  );
}
