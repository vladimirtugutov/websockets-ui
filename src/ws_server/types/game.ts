export type Ship = {
  position: { x: number; y: number };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
};

export type CellStatus = 'empty' | 'ship' | 'hit' | 'miss' | 'killed';

export type BoardCell = {
  x: number;
  y: number;
  status: CellStatus;
};
