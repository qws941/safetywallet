import { Hono } from "hono";
import syncWorkersRoutes from "./sync-workers-routes";
import queryRoutes from "./query-routes";
import hyperdriveRoutes from "./hyperdrive-routes";
import type { AdminFasBindings, AdminFasVariables } from "./types";

const app = new Hono<{
  Bindings: AdminFasBindings;
  Variables: AdminFasVariables;
}>();

app.route("/", syncWorkersRoutes);
app.route("/", queryRoutes);
app.route("/", hyperdriveRoutes);

export const adminFas = app;

export default adminFas;
