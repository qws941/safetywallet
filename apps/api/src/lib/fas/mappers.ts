import type { FasAttendance, FasEmployee } from "./types";

export function mapToFasEmployee(row: Record<string, unknown>): FasEmployee {
  const stateFlag = String(row["state_flag"] || "");
  return {
    emplCd: String(row["empl_cd"] || ""),
    name: String(row["empl_nm"] || ""),
    partCd: String(row["part_cd"] || ""),
    companyName: String(row["part_nm"] || ""),
    phone: String(row["tel_no"] || ""),
    socialNo: String(row["social_no"] || ""),
    gojoCd: String(row["gojo_cd"] || ""),
    jijoCd: String(row["jijo_cd"] || ""),
    careCd: String(row["care_cd"] || ""),
    roleCd: String(row["role_cd"] || ""),
    stateFlag,
    entrDay: String(row["entr_day"] || ""),
    retrDay: String(row["retr_day"] || ""),
    rfid: String(row["rfid"] || ""),
    violCnt: Number(row["viol_cnt"] || 0),
    updatedAt: row["update_dt"] instanceof Date ? row["update_dt"] : new Date(),
    isActive: stateFlag === "W",
  };
}

export function mapToFasAttendance(
  row: Record<string, unknown>,
): FasAttendance {
  const inTime = row["in_time"];
  const outTime = row["out_time"];
  return {
    emplCd: String(row["empl_cd"] || ""),
    accsDay: String(row["accs_day"] || ""),
    inTime: inTime ? String(inTime).padStart(4, "0") : null,
    outTime: outTime ? String(outTime).padStart(4, "0") : null,
    state: Number(row["state"] || 0),
    partCd: String(row["part_cd"] || ""),
  };
}
