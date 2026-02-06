import mysql from "mysql2/promise";
import type { HyperdriveBinding } from "../types";

// mysql2/promise의 createConnection은 Connection 타입을 반환하지만
// 실제로는 query 메서드를 포함함. 타입 정의가 불완전하므로 any 사용.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MySqlConnection = any;

export interface FasEmployee {
  id: number;
  name: string;
  phone: string;
  birthDate: string;
  companyId: number;
  companyName: string;
  departmentId: number;
  departmentName: string;
  positionId: number;
  positionName: string;
  isActive: boolean;
  modifiedAt: Date;
}

export interface FasAttendance {
  employeeId: number;
  date: string;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  deviceId: string;
  siteId: number;
}

export interface FasLoginResult {
  success: boolean;
  userId: string;
  userName: string;
}

async function getConnection(
  hyperdrive: HyperdriveBinding,
): Promise<MySqlConnection> {
  return mysql.createConnection({
    host: hyperdrive.host,
    port: hyperdrive.port,
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    namedPlaceholders: true,
    connectTimeout: 5000,
  });
}

export async function fasLogin(
  hyperdrive: HyperdriveBinding,
  userId: string,
): Promise<FasLoginResult | null> {
  const conn = await getConnection(hyperdrive);
  try {
    const [rows] = await conn.query("CALL usp_login(?)", [userId]);
    const results = rows as Array<Array<Record<string, unknown>>>;
    if (!results[0] || results[0].length === 0) {
      return null;
    }
    const row = results[0][0];
    return {
      success: true,
      userId: String(row["user_id"] || ""),
      userName: String(row["user_name"] || ""),
    };
  } finally {
    await conn.end();
  }
}

export async function fasGetEmployeeInfo(
  hyperdrive: HyperdriveBinding,
  companyId: number,
  employeeId: number,
): Promise<FasEmployee | null> {
  const conn = await getConnection(hyperdrive);
  try {
    const [rows] = await conn.query(
      "CALL usp_viewer_employee_info_query(?, ?)",
      [companyId, employeeId],
    );
    const results = rows as Array<Array<Record<string, unknown>>>;
    if (!results[0] || results[0].length === 0) {
      return null;
    }
    return mapToFasEmployee(results[0][0]);
  } finally {
    await conn.end();
  }
}

export async function fasGetUpdatedEmployees(
  hyperdrive: HyperdriveBinding,
  companyId: number,
  sinceTimestamp: string,
): Promise<FasEmployee[]> {
  const conn = await getConnection(hyperdrive);
  try {
    const [rows] = await conn.query(
      "CALL usp_viewer_employee_updated_query(?, ?)",
      [companyId, sinceTimestamp],
    );
    const results = rows as Array<Array<Record<string, unknown>>>;
    if (!results[0]) {
      return [];
    }
    return results[0].map(mapToFasEmployee);
  } finally {
    await conn.end();
  }
}

export async function fasGetDailyAttendance(
  hyperdrive: HyperdriveBinding,
  params: {
    companyId: number;
    departmentId: number;
    startDate: string;
    endDate: string;
    employeeId: number;
    pageNo: number;
    pageSize: number;
    sortColumn: number;
    sortOrder: number;
    searchKeyword: string;
  },
): Promise<FasAttendance[]> {
  const conn = await getConnection(hyperdrive);
  try {
    const [rows] = await conn.query(
      "CALL usp_access_employee_daily_query_20(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        params.companyId,
        params.departmentId,
        params.startDate,
        params.endDate,
        params.employeeId,
        params.pageNo,
        params.pageSize,
        params.sortColumn,
        params.sortOrder,
        params.searchKeyword,
      ],
    );
    const results = rows as Array<Array<Record<string, unknown>>>;
    if (!results[0]) {
      return [];
    }
    return results[0].map(mapToFasAttendance);
  } finally {
    await conn.end();
  }
}

export async function fasSearchEmployeeByPhone(
  hyperdrive: HyperdriveBinding,
  companyId: number,
  phone: string,
): Promise<FasEmployee | null> {
  const conn = await getConnection(hyperdrive);
  try {
    const normalizedPhone = phone.replace(/-/g, "");
    const [rows] = await conn.query(
      `SELECT e.*, c.company_name, d.department_name, p.position_name
       FROM tb_employee e
       LEFT JOIN tb_company c ON e.company_id = c.company_id
       LEFT JOIN tb_department d ON e.department_id = d.department_id
       LEFT JOIN tb_position p ON e.position_id = p.position_id
       WHERE e.company_id = ? AND REPLACE(e.phone, '-', '') = ?
       LIMIT 1`,
      [companyId, normalizedPhone],
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

function mapToFasEmployee(row: Record<string, unknown>): FasEmployee {
  return {
    id: Number(row["employee_id"] || row["id"] || 0),
    name: String(row["employee_name"] || row["name"] || ""),
    phone: String(row["phone"] || ""),
    birthDate: String(row["birth_date"] || row["birthdate"] || ""),
    companyId: Number(row["company_id"] || 0),
    companyName: String(row["company_name"] || ""),
    departmentId: Number(row["department_id"] || 0),
    departmentName: String(row["department_name"] || ""),
    positionId: Number(row["position_id"] || 0),
    positionName: String(row["position_name"] || ""),
    isActive: row["is_active"] === 1 || row["is_active"] === true,
    modifiedAt:
      row["modified_at"] instanceof Date ? row["modified_at"] : new Date(),
  };
}

function mapToFasAttendance(row: Record<string, unknown>): FasAttendance {
  return {
    employeeId: Number(row["employee_id"] || 0),
    date: String(row["access_date"] || row["date"] || ""),
    checkInTime:
      row["check_in_time"] instanceof Date ? row["check_in_time"] : null,
    checkOutTime:
      row["check_out_time"] instanceof Date ? row["check_out_time"] : null,
    deviceId: String(row["device_id"] || ""),
    siteId: Number(row["site_id"] || 0),
  };
}

export async function testConnection(
  hyperdrive: HyperdriveBinding,
): Promise<boolean> {
  try {
    const conn = await getConnection(hyperdrive);
    await conn.ping();
    await conn.end();
    return true;
  } catch {
    return false;
  }
}
