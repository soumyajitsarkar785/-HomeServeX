declare module 'pg' {
  export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
    command: string;
  }

  export interface PoolClient {
    query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: any);
    query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}

declare module 'socket.io' {
  export interface SocketBroadcastOperator {
    emit(event: string, data?: any): boolean;
  }

  export interface Socket {
    id: string;
    connected: boolean;
    join(room: string | string[]): void;
    leave(room: string): void;
    on(event: string, callback: (...args: any[]) => void): this;
    emit(event: string, data?: any): boolean;
    to(room: string): SocketBroadcastOperator;
  }

  export class Server {
    constructor(server?: any, options?: any);
    on(event: 'connection', callback: (socket: Socket) => void): this;
    to(room: string): SocketBroadcastOperator;
    emit(event: string, data?: any): boolean;
  }
}
