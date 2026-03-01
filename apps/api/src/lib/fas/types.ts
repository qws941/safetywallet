import type { HyperdriveBinding } from "../../types";

export interface FasSource {
  dbName: string;
  siteCd: string;
  d1SiteName: string;
  workerIdPrefix: string;
}

let HYPERDRIVE_DB = "mdidev";

export let FAS_SOURCES: readonly FasSource[] = [
  {
    dbName: "mdidev",
    siteCd: "10",
    d1SiteName: "송도세브란스",
    workerIdPrefix: "",
  },
];

export let DEFAULT_FAS_SOURCE: FasSource = FAS_SOURCES[0];

export function initFasConfig(env: {
  FAS_DB_NAME?: string;
  FAS_SITE_CD?: string;
  FAS_SITE_NAME?: string;
}): void {
  const dbName = env.FAS_DB_NAME ?? "mdidev";
  const siteCd = env.FAS_SITE_CD ?? "10";
  const siteName = env.FAS_SITE_NAME ?? "송도세브란스";

  HYPERDRIVE_DB = dbName;
  FAS_SOURCES = [{ dbName, siteCd, d1SiteName: siteName, workerIdPrefix: "" }];
  DEFAULT_FAS_SOURCE = FAS_SOURCES[0];
}

export function resolveFasSource(dbName?: string | null): FasSource {
  if (!dbName) return DEFAULT_FAS_SOURCE;
  const found = FAS_SOURCES.find((s) => s.dbName === dbName);
  return found ?? DEFAULT_FAS_SOURCE;
}

export function resolveFasSourceByWorkerId(externalWorkerId: string): {
  source: FasSource;
  rawEmplCd: string;
} {
  for (const s of FAS_SOURCES) {
    if (s.workerIdPrefix && externalWorkerId.startsWith(s.workerIdPrefix)) {
      return {
        source: s,
        rawEmplCd: externalWorkerId.slice(s.workerIdPrefix.length),
      };
    }
  }
  return { source: DEFAULT_FAS_SOURCE, rawEmplCd: externalWorkerId };
}

export function tbl(source: FasSource, table: string): string {
  return source.dbName === HYPERDRIVE_DB ? table : `${source.dbName}.${table}`;
}

export type MysqlQueryParams = ReadonlyArray<unknown> | Record<string, unknown>;

export interface MysqlConnection {
  ping(): Promise<void>;
  end(): Promise<void>;
  query(sql: string, values?: MysqlQueryParams): Promise<[unknown, unknown]>;
}

export interface FasEmployee {
  emplCd: string;
  name: string;
  partCd: string;
  companyName: string;
  phone: string;
  socialNo: string;
  gojoCd: string;
  jijoCd: string;
  careCd: string;
  roleCd: string;
  stateFlag: string;
  entrDay: string;
  retrDay: string;
  rfid: string;
  violCnt: number;
  updatedAt: Date;
  isActive: boolean;
}

export interface FasAttendance {
  emplCd: string;
  accsDay: string;
  inTime: string | null;
  outTime: string | null;
  state: number;
  partCd: string;
}

export interface FasRawAttendanceSummary {
  source: string;
  totalRows: number;
  checkins: number;
  uniqueWorkers: number;
  workerIds: string[];
}

export interface FasRawAttendanceRowsResult {
  source: string;
  rows: Array<Record<string, unknown>>;
}

export interface FasAttendanceRealtimeStats {
  source: string;
  totalRows: number;
  checkedInWorkers: number;
  dedupCheckinEvents: number;
}

export interface FasAttendanceSiteCount {
  siteCd: string;
  rowCount: number;
}

export interface FasAttendanceTrendPoint {
  date: string;
  count: number;
}

export interface FasAttendanceListRecord {
  emplCd: string;
  name: string;
  partCd: string;
  companyName: string;
  inTime: string | null;
  outTime: string | null;
  accsDay: string;
}

export type FasHyperdrive = HyperdriveBinding;
