import type { AuthContext, Env } from "../../../types";

export interface FasWorkerInput {
  externalWorkerId: string;
  name: string;
  phone: string;
  dob: string;
}

export interface SyncFasWorkersBody {
  siteId: string;
  workers: FasWorkerInput[];
}

export type AdminFasVariables = { auth: AuthContext };
export type AdminFasBindings = Env;
