import type { FasAttendance } from "./types";

export function formatAccsDayWithDash(accsDay: string): string {
  return `${accsDay.slice(0, 4)}-${accsDay.slice(4, 6)}-${accsDay.slice(6, 8)}`;
}

export function mergeAttendanceRecord(
  byWorker: Map<string, FasAttendance>,
  row: FasAttendance,
): void {
  const key = `${row.emplCd}|${row.accsDay}`;
  const existing = byWorker.get(key);
  if (!existing) {
    byWorker.set(key, row);
    return;
  }

  const mergedInTime =
    existing.inTime && row.inTime
      ? existing.inTime <= row.inTime
        ? existing.inTime
        : row.inTime
      : (existing.inTime ?? row.inTime);

  const mergedOutTime =
    existing.outTime && row.outTime
      ? existing.outTime >= row.outTime
        ? existing.outTime
        : row.outTime
      : (existing.outTime ?? row.outTime);

  byWorker.set(key, {
    ...existing,
    inTime: mergedInTime,
    outTime: mergedOutTime,
    partCd: existing.partCd || row.partCd,
    state: existing.state || row.state,
  });
}

export function sortAttendanceByInTime(
  records: FasAttendance[],
): FasAttendance[] {
  return records.sort((a, b) => {
    const aTime = a.inTime ?? "9999";
    const bTime = b.inTime ?? "9999";
    return aTime.localeCompare(bTime);
  });
}
