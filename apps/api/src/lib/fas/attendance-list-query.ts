import type { HyperdriveBinding } from "../../types";
import { getConnection, queryWithTimeout } from "./connection";
import {
  DEFAULT_FAS_SOURCE,
  tbl,
  type FasAttendanceListRecord,
  type FasSource,
} from "./types";

export async function fasGetAttendanceList(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
  limit = 50,
  offset = 0,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<{ records: FasAttendanceListRecord[]; total: number }> {
  const conn = await getConnection(hyperdrive);
  const normalizedSiteCd =
    siteCd === undefined || siteCd === null ? null : siteCd;
  const safeLimit = Math.min(500, Math.max(1, Math.trunc(limit)));
  const safeOffset = Math.max(0, Math.trunc(offset));

  const siteClause = normalizedSiteCd ? " AND ad.site_cd = ?" : "";
  const baseParams: unknown[] = [accsDay];
  if (normalizedSiteCd) {
    baseParams.push(normalizedSiteCd);
  }

  try {
    const [countRows] = await queryWithTimeout(
      conn,
      `SELECT COUNT(*) AS cnt
       FROM ${tbl(source, "access_daily")} ad
      WHERE ad.accs_day = ?
        AND ad.in_time IS NOT NULL
        AND ad.in_time != '0000'
        AND ad.in_time != ''${siteClause}`,
      baseParams,
    );

    const [rows] = await queryWithTimeout(
      conn,
      `SELECT ad.empl_cd AS empl_cd,
            COALESCE(e.empl_nm, '') AS empl_nm,
            COALESCE(e.part_cd, ad.part_cd, '') AS part_cd,
            COALESCE(p.part_nm, '') AS part_nm,
            ad.in_time AS in_time,
            ad.out_time AS out_time,
            ad.accs_day AS accs_day
       FROM ${tbl(source, "access_daily")} ad
       LEFT JOIN ${tbl(source, "employee")} e
         ON ad.site_cd = e.site_cd
        AND ad.empl_cd = e.empl_cd
       LEFT JOIN ${tbl(source, "partner")} p
         ON e.site_cd = p.site_cd
        AND e.part_cd = p.part_cd
      WHERE ad.accs_day = ?
        AND ad.in_time IS NOT NULL
        AND ad.in_time != '0000'
        AND ad.in_time != ''${siteClause}
      ORDER BY ad.in_time DESC, ad.empl_cd ASC
      LIMIT ? OFFSET ?`,
      [...baseParams, safeLimit, safeOffset],
    );

    const total = Number(
      (countRows as Array<Record<string, unknown>>)[0]?.cnt || 0,
    );
    const records = (rows as Array<Record<string, unknown>>).map((row) => ({
      emplCd: String(row["empl_cd"] || ""),
      name: String(row["empl_nm"] || ""),
      partCd: String(row["part_cd"] || ""),
      companyName: String(row["part_nm"] || ""),
      inTime: row["in_time"] ? String(row["in_time"]) : null,
      outTime: row["out_time"] ? String(row["out_time"]) : null,
      accsDay: String(row["accs_day"] || ""),
    }));

    return { records, total };
  } finally {
    await conn.end();
  }
}
