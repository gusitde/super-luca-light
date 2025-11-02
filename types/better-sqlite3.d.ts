declare module 'better-sqlite3' {
  export interface RunResult {
    changes: number;
    lastInsertRowid: number;
  }

  export interface Statement<Row = unknown> {
    run(parameters?: any): RunResult;
    get(parameters?: any): Row | undefined;
    all(parameters?: any): Row[];
    iterate(parameters?: any): IterableIterator<Row>;
    pluck(toggleState?: boolean): this;
    expand(toggleState?: boolean): this;
    raw(toggleState?: boolean): this;
    bind(parameters?: any): this;
  }

  export interface Transaction<Args extends any[], Result = any> {
    (...parameters: Args): Result;
  }

  export interface DatabaseOptions {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?(message?: unknown, ...additional: unknown[]): void;
  }

  export interface Database {
    pragma(query: string, options?: { simple?: boolean }): any;
    prepare<Row = unknown>(source: string): Statement<Row>;
    exec(source: string): this;
    transaction<Args extends any[], Result = any>(fn: (...args: Args) => Result): Transaction<Args, Result>;
    close(): void;
  }

  interface DatabaseConstructor {
    new (path: string, options?: DatabaseOptions): Database;
    (path: string, options?: DatabaseOptions): Database;
    prototype: Database;
  }

  const Database: DatabaseConstructor;
  export default Database;
}

