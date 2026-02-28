declare module "sql.js/dist/sql-asm.js" {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  interface Database {
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    close(): void;
  }

  interface Statement {
    step(): boolean;
    get(): (number | string | Uint8Array | null)[];
    free(): void;
  }

  interface QueryExecResult {
    columns: string[];
    values: (number | string | Uint8Array | null)[][];
  }

  function initSqlJs(): Promise<SqlJsStatic>;
  export default initSqlJs;
}
