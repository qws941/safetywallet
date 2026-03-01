import mysql from "mysql2/promise";
import { createLogger } from "../logger";
import type { HyperdriveBinding } from "../../types";
import type { MysqlConnection } from "./types";

interface PooledConnection {
  connection: MysqlConnection;
  lastUsed: number;
}

const logger = createLogger("fas-mariadb");
export const connectionCache = new Map<string, PooledConnection>();
const CACHE_TIMEOUT_MS = 30 * 1000;
const FAS_QUERY_TIMEOUT_MS = 10 * 1000;

export async function getConnection(
  hyperdrive: HyperdriveBinding,
): Promise<MysqlConnection> {
  const cacheKey = `${hyperdrive.host}:${hyperdrive.port}`;
  const now = Date.now();

  const cached = connectionCache.get(cacheKey);
  if (cached && now - cached.lastUsed < CACHE_TIMEOUT_MS) {
    try {
      await Promise.race([
        cached.connection.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("FAS ping timeout")), 5000),
        ),
      ]);
      cached.lastUsed = now;
      return cached.connection;
    } catch (err) {
      logger.debug("Cached FAS connection ping failed, rotating connection", {
        action: "fas_connection_cache_ping_failed",
        error: { name: "PingError", message: String(err) },
      });
      connectionCache.delete(cacheKey);
    }
  }

  const conn = (await mysql.createConnection({
    host: hyperdrive.host,
    port: hyperdrive.port,
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    namedPlaceholders: true,
    connectTimeout: 5000,
    disableEval: true,
    waitForConnections: true,
    connectionLimit: 1,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  })) as unknown as MysqlConnection;

  connectionCache.set(cacheKey, { connection: conn, lastUsed: now });
  return conn;
}

export function cleanupExpiredConnections(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [key, pooled] of connectionCache.entries()) {
    if (now - pooled.lastUsed > CACHE_TIMEOUT_MS) {
      expiredKeys.push(key);
    }
  }

  for (const key of expiredKeys) {
    const pooled = connectionCache.get(key);
    if (pooled) {
      pooled.connection.end().catch(() => {
        return;
      });
      connectionCache.delete(key);
    }
  }
}

export async function queryWithTimeout(
  conn: MysqlConnection,
  query: string,
  params: unknown[],
  timeoutMs: number = FAS_QUERY_TIMEOUT_MS,
): Promise<[unknown[], unknown]> {
  return Promise.race([
    conn.query(query, params) as Promise<[unknown[], unknown]>,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`FAS query timeout after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

export async function testConnection(
  hyperdrive: HyperdriveBinding,
): Promise<boolean> {
  try {
    const conn = await getConnection(hyperdrive);
    await Promise.race([
      conn.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("FAS ping timeout")), 5000),
      ),
    ]);
    await conn.end();
    return true;
  } catch (err) {
    logger.warn("FAS connection test failed", {
      action: "fas_connection_test_failed",
      error: { name: "ConnectionError", message: String(err) },
    });
    return false;
  }
}
