import type { HyperdriveBinding } from "../../types";
import {
  DEFAULT_FAS_SOURCE,
  type FasAttendance,
  type FasAttendanceListRecord,
  type FasAttendanceRealtimeStats,
  type FasAttendanceSiteCount,
  type FasAttendanceTrendPoint,
  type FasEmployee,
  type FasRawAttendanceRowsResult,
  type FasRawAttendanceSummary,
  type FasSource,
} from "./types";
import {
  fasGetAttendanceTrend as fasGetAttendanceTrendImpl,
  fasGetDailyAttendance as fasGetDailyAttendanceImpl,
  fasGetDailyAttendanceRawRows as fasGetDailyAttendanceRawRowsImpl,
  fasGetDailyAttendanceRawSummary as fasGetDailyAttendanceRawSummaryImpl,
  fasGetDailyAttendanceRealtimeStats as fasGetDailyAttendanceRealtimeStatsImpl,
  fasGetDailyAttendanceSiteCounts as fasGetDailyAttendanceSiteCountsImpl,
} from "./attendance-ops";
import { fasGetAttendanceList as fasGetAttendanceListImpl } from "./attendance-list-query";
import {
  fasCheckWorkerAttendance as fasCheckWorkerAttendanceImpl,
  fasSearchEmployeeByName as fasSearchEmployeeByNameImpl,
  fasSearchEmployeeByPhone as fasSearchEmployeeByPhoneImpl,
} from "./attendance-extra-queries";

export async function fasGetDailyAttendance(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasAttendance[]> {
  return fasGetDailyAttendanceImpl(hyperdrive, accsDay, siteCd, source);
}

export async function fasGetDailyAttendanceRawSummary(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasRawAttendanceSummary> {
  return fasGetDailyAttendanceRawSummaryImpl(
    hyperdrive,
    accsDay,
    siteCd,
    source,
  );
}

export async function fasGetDailyAttendanceRawRows(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
  limit = 200,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasRawAttendanceRowsResult> {
  return fasGetDailyAttendanceRawRowsImpl(
    hyperdrive,
    accsDay,
    siteCd,
    limit,
    source,
  );
}

export async function fasGetDailyAttendanceRealtimeStats(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasAttendanceRealtimeStats> {
  return fasGetDailyAttendanceRealtimeStatsImpl(
    hyperdrive,
    accsDay,
    siteCd,
    source,
  );
}

export async function fasGetDailyAttendanceSiteCounts(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  limit = 10,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<{ source: string; siteCounts: FasAttendanceSiteCount[] }> {
  return fasGetDailyAttendanceSiteCountsImpl(
    hyperdrive,
    accsDay,
    limit,
    source,
  );
}

export async function fasGetAttendanceTrend(
  hyperdrive: HyperdriveBinding,
  startAccsDay: string,
  endAccsDay: string,
  siteCd?: string | null,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasAttendanceTrendPoint[]> {
  return fasGetAttendanceTrendImpl(
    hyperdrive,
    startAccsDay,
    endAccsDay,
    siteCd,
    source,
  );
}

export async function fasGetAttendanceList(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
  limit = 50,
  offset = 0,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<{ records: FasAttendanceListRecord[]; total: number }> {
  return fasGetAttendanceListImpl(
    hyperdrive,
    accsDay,
    siteCd,
    limit,
    offset,
    source,
  );
}

export async function fasCheckWorkerAttendance(
  hyperdrive: HyperdriveBinding,
  emplCd: string,
  accsDay: string,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<{ hasAttendance: boolean; records: FasAttendance[] }> {
  return fasCheckWorkerAttendanceImpl(hyperdrive, emplCd, accsDay, source);
}

export async function fasSearchEmployeeByPhone(
  hyperdrive: HyperdriveBinding,
  phone: string,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasEmployee | null> {
  return fasSearchEmployeeByPhoneImpl(hyperdrive, phone, source);
}

export async function fasSearchEmployeeByName(
  hyperdrive: HyperdriveBinding,
  name: string,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasEmployee[]> {
  return fasSearchEmployeeByNameImpl(hyperdrive, name, source);
}
