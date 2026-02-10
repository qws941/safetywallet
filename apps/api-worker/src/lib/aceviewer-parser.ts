/**
 * AceViewer.db3 SQLite Parser
 *
 * Parses the AceViewer.db3 file (from AceTime construction site access control system)
 * using sql.js (asm.js build — no WASM binary needed).
 *
 * The SQLite file contains EUC-KR encoded text, so all string values
 * are decoded from raw bytes to UTF-8 before returning.
 */
// Polyfill __dirname for CF Workers — sql.js checks for Node.js env
// and tries to use __dirname when `process` is defined (nodejs_compat).
if (typeof (globalThis as { __dirname?: string }).__dirname === "undefined") {
  (globalThis as { __dirname?: string }).__dirname = "/";
}
import initSqlJs from "sql.js/dist/sql-asm.js";

export interface AceViewerEmployee {
  /** Employee code (PK in AceViewer), e.g. "25000001" */
  externalWorkerId: string;
  /** Employee name (decoded from EUC-KR), e.g. "김우현" */
  name: string;
  /** Company name from part_nm, e.g. "미래도시건설" */
  companyName: string | null;
  /** Position from jijo_nm, e.g. "관리자", "형틀" */
  position: string | null;
  /** Trade/task from gojo_nm, e.g. "관리/감독", "철근콘크리트" */
  trade: string | null;
  /** Last seen datetime, e.g. "2026-02-06 07:32:49" */
  lastSeen: string | null;
}

/**
 * Decode EUC-KR bytes to UTF-8 string.
 * Falls back to raw UTF-8 decode if EUC-KR TextDecoder is unavailable.
 */
function decodeEucKr(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Uint8Array) {
    try {
      const decoder = new TextDecoder("euc-kr");
      return decoder.decode(value);
    } catch {
      // Fallback: try as UTF-8
      return new TextDecoder("utf-8").decode(value);
    }
  }

  if (typeof value === "string") return value;
  return String(value);
}

/**
 * Parse AceViewer.db3 binary data and extract employee records.
 *
 * @param dbBytes - Raw bytes of AceViewer.db3 file
 * @returns Array of parsed employee records
 */
export async function parseAceViewerDb(
  dbBytes: Uint8Array,
): Promise<AceViewerEmployee[]> {
  const SQL = await initSqlJs();
  const db = new SQL.Database(dbBytes);

  try {
    // CAST AS BLOB to get raw EUC-KR bytes — sql.js corrupts non-UTF-8 text otherwise
    const stmt = db.prepare(
      `SELECT
        CAST(empl_cd AS BLOB),
        CAST(empl_nm AS BLOB),
        CAST(part_nm AS BLOB),
        CAST(jijo_nm AS BLOB),
        CAST(gojo_nm AS BLOB),
        CAST(last_dt AS BLOB)
      FROM employee`,
    );
    const employees: AceViewerEmployee[] = [];

    while (stmt.step()) {
      const row = stmt.get();
      // sql.js returns values in column order
      const emplCd = decodeEucKr(row[0]);
      const emplNm = decodeEucKr(row[1]);
      const partNm = decodeEucKr(row[2]);
      const jijoNm = decodeEucKr(row[3]);
      const gojoNm = decodeEucKr(row[4]);
      const lastDt = decodeEucKr(row[5]);

      if (!emplCd || !emplNm) continue; // Skip records without ID or name

      employees.push({
        externalWorkerId: emplCd,
        name: emplNm,
        companyName: partNm,
        position: jijoNm,
        trade: gojoNm,
        lastSeen: lastDt,
      });
    }

    stmt.free();
    return employees;
  } finally {
    db.close();
  }
}

/**
 * Get basic stats about the AceViewer database.
 */
export async function getAceViewerStats(dbBytes: Uint8Array): Promise<{
  totalEmployees: number;
  companies: string[];
  lastSync: string | null;
}> {
  const SQL = await initSqlJs();
  const db = new SQL.Database(dbBytes);

  try {
    const countResult = db.exec("SELECT COUNT(*) FROM employee");
    const totalEmployees = (countResult[0]?.values[0]?.[0] as number) || 0;

    const companiesResult = db.exec(
      "SELECT DISTINCT CAST(part_nm AS BLOB) FROM employee WHERE part_nm IS NOT NULL",
    );
    const companies = (companiesResult[0]?.values || [])
      .map((row) => decodeEucKr(row[0]))
      .filter((v): v is string => v !== null);

    const lastSyncResult = db.exec(
      "SELECT MAX(CAST(last_dt AS BLOB)) FROM employee",
    );
    const lastSync = decodeEucKr(lastSyncResult[0]?.values[0]?.[0] ?? null);

    return { totalEmployees, companies, lastSync };
  } finally {
    db.close();
  }
}
