/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';

export declare const httpServer: (
  req: IncomingMessage,
  res: ServerResponse
) => void;
