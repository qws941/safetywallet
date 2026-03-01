import type { HyperdriveBinding } from "../../types";
import { FasGetUpdatedEmployeesParamsSchema } from "../../validators/fas-sync";
import { getConnection, queryWithTimeout } from "./connection";
import { mapToFasEmployee } from "./mappers";
import {
  DEFAULT_FAS_SOURCE,
  tbl,
  type FasEmployee,
  type FasSource,
} from "./types";

export const employeeSelect = `e.empl_cd, e.empl_nm, e.part_cd, e.tel_no, e.social_no,
  e.state_flag, e.entr_day, e.retr_day, e.update_dt,
  e.gojo_cd, e.jijo_cd, e.care_cd, e.role_cd, e.rfid,
  e.viol_cnt, e.viol_yn,
  p.part_nm`;

export function employeeFrom(source: FasSource): string {
  return `FROM ${tbl(source, "employee")} e
  LEFT JOIN ${tbl(source, "partner")} p ON e.site_cd = p.site_cd AND e.part_cd = p.part_cd`;
}

export async function fasGetEmployeeInfo(
  hyperdrive: HyperdriveBinding,
  emplCd: string,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasEmployee | null> {
  const conn = await getConnection(hyperdrive);
  try {
    const [rows] = await queryWithTimeout(
      conn,
      `SELECT ${employeeSelect} ${employeeFrom(source)}
     WHERE e.site_cd = ? AND e.empl_cd = ?
     LIMIT 1`,
      [source.siteCd, emplCd],
    );
    const results = rows as Array<Record<string, unknown>>;
    if (results.length === 0) {
      return null;
    }
    return mapToFasEmployee(results[0]);
  } finally {
    await conn.end();
  }
}

export async function fasGetEmployeesBatch(
  hyperdrive: HyperdriveBinding,
  emplCds: string[],
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<Map<string, FasEmployee>> {
  if (emplCds.length === 0) {
    return new Map();
  }

  const conn = await getConnection(hyperdrive);
  try {
    const placeholders = emplCds.map(() => "?").join(",");
    const [rows] = await queryWithTimeout(
      conn,
      `SELECT ${employeeSelect} ${employeeFrom(source)}
     WHERE e.site_cd = ? AND e.empl_cd IN (${placeholders})`,
      [source.siteCd, ...emplCds],
    );
    const results = rows as Array<Record<string, unknown>>;
    const map = new Map<string, FasEmployee>();
    for (const row of results) {
      const employee = mapToFasEmployee(row);
      if (employee.emplCd) {
        map.set(employee.emplCd, employee);
      }
    }
    return map;
  } finally {
    await conn.end();
  }
}

export async function fasGetUpdatedEmployees(
  hyperdrive: HyperdriveBinding,
  sinceTimestamp: string | null,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasEmployee[]> {
  const validated = FasGetUpdatedEmployeesParamsSchema.parse({
    sinceTimestamp,
  });

  const conn = await getConnection(hyperdrive);
  try {
    let query = `SELECT ${employeeSelect} ${employeeFrom(source)}
      WHERE e.site_cd = ?`;
    const params: unknown[] = [source.siteCd];

    if (validated.sinceTimestamp) {
      query += ` AND e.update_dt > ?`;
      params.push(validated.sinceTimestamp);
    }

    query += ` ORDER BY e.update_dt ASC`;

    const [rows] = await queryWithTimeout(conn, query, params);
    const results = rows as Array<Record<string, unknown>>;
    return results.map(mapToFasEmployee);
  } finally {
    await conn.end();
  }
}

export async function fasGetAllEmployeesPaginated(
  hyperdrive: HyperdriveBinding,
  offset: number,
  limit: number,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<{ employees: FasEmployee[]; total: number }> {
  const conn = await getConnection(hyperdrive);
  try {
    const [countRows] = await queryWithTimeout(
      conn,
      `SELECT COUNT(*) as cnt ${employeeFrom(source)} WHERE e.site_cd = ?`,
      [source.siteCd],
    );
    const total = (countRows as Array<Record<string, unknown>>)[0]
      .cnt as number;

    const [rows] = await queryWithTimeout(
      conn,
      `SELECT ${employeeSelect} ${employeeFrom(source)}
     WHERE e.site_cd = ?
     ORDER BY e.empl_cd ASC
     LIMIT ? OFFSET ?`,
      [source.siteCd, limit, offset],
    );
    const results = rows as Array<Record<string, unknown>>;
    return { employees: results.map(mapToFasEmployee), total };
  } finally {
    await conn.end();
  }
}
