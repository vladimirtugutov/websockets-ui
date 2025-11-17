export interface IncomingMessage<T = unknown> {
  type: string;
  data: T;
  id: number;
}

export interface OutgoingMessage<T = unknown> {
  type: string;
  data: T;
  id: number;
}
