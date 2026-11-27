// GET /api/state – data pro tablet v baru (bez citlivých údajů).
import { json, readState, publicState } from "../lib/store.mjs";

export default async () => json(publicState(await readState()));

export const config = { path: "/api/state" };
