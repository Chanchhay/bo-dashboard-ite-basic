import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StoredPushSubscription } from "./types";

/**
 * Where push registrations live.
 *
 * This app has no database of its own — every other piece of business data
 * is owned by the external API this dashboard proxies to. A push
 * registration is different: it is nothing the backend needs to know about
 * to do its job, only something *this* process needs in order to answer
 * "who do I wake up". A JSON file kept in memory and mirrored to disk is
 * enough for that, on the single long-running server this app is deployed
 * as (see AGENTS.md/CLAUDE.md's deployment notes) — it survives a restart,
 * which the in-memory-only version this replaced did not.
 *
 * This does **not** survive a serverless/multi-instance deployment: each
 * instance would keep its own file and disagree about who is subscribed.
 * If this app is ever moved onto one, swap this module's body for a call to
 * a real table or a shared cache — every caller goes through the four
 * functions exported below, so that is the entire surface to change.
 */
const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "push-subscriptions.json");

/** userId -> endpoint -> subscription. Endpoint is the natural per-device key. */
type Store = Map<string, Map<string, StoredPushSubscription>>;

let cache: Store | null = null;
let loading: Promise<Store> | null = null;

/** Serializes writes so two saves in quick succession can't interleave onto disk. */
let writeQueue: Promise<unknown> = Promise.resolve();

function toStore(records: StoredPushSubscription[]): Store {
  const store: Store = new Map();

  for (const record of records) {
    let byEndpoint = store.get(record.userId);

    if (!byEndpoint) {
      byEndpoint = new Map();
      store.set(record.userId, byEndpoint);
    }

    byEndpoint.set(record.endpoint, record);
  }

  return store;
}

function toRecords(store: Store): StoredPushSubscription[] {
  const records: StoredPushSubscription[] = [];

  for (const byEndpoint of store.values()) {
    records.push(...byEndpoint.values());
  }

  return records;
}

async function load(): Promise<Store> {
  loading ??= (async () => {
    try {
      const raw = await readFile(FILE_PATH, "utf8");
      const parsed = JSON.parse(raw) as StoredPushSubscription[];

      return toStore(Array.isArray(parsed) ? parsed : []);
    } catch {
      // First run, or a file that hasn't been created yet — an empty store,
      // not a failure.
      return new Map();
    }
  })();

  cache = await loading;

  return cache;
}

async function withStore(): Promise<Store> {
  if (cache) return cache;

  return load();
}

/**
 * Write-through: the file is the backup, the map already in memory is what
 * every read answers from, so a save never sits on the critical path of a
 * push actually going out.
 */
function persist(store: Store): void {
  const snapshot = toRecords(store);

  writeQueue = writeQueue.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });

    const tmpPath = `${FILE_PATH}.${process.pid}.tmp`;

    await writeFile(tmpPath, JSON.stringify(snapshot), "utf8");
    await rename(tmpPath, FILE_PATH);
  });
}

export async function addSubscription(
  subscription: Omit<StoredPushSubscription, "createdAt">,
): Promise<void> {
  const store = await withStore();
  let byEndpoint = store.get(subscription.userId);

  if (!byEndpoint) {
    byEndpoint = new Map();
    store.set(subscription.userId, byEndpoint);
  }

  byEndpoint.set(subscription.endpoint, {
    ...subscription,
    createdAt: new Date().toISOString(),
  });

  persist(store);
}

export async function removeSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  const store = await withStore();
  const byEndpoint = store.get(userId);

  if (!byEndpoint?.delete(endpoint)) return;

  if (byEndpoint.size === 0) store.delete(userId);

  persist(store);
}

/** Drops a dead registration wherever it is — used to prune a 404/410 from the push service. */
export async function removeByEndpoint(endpoint: string): Promise<void> {
  const store = await withStore();
  let changed = false;

  for (const [userId, byEndpoint] of store) {
    if (byEndpoint.delete(endpoint)) {
      changed = true;
      if (byEndpoint.size === 0) store.delete(userId);
    }
  }

  if (changed) persist(store);
}

export async function getSubscriptionsForUsers(
  userIds: string[],
): Promise<StoredPushSubscription[]> {
  const store = await withStore();
  const result: StoredPushSubscription[] = [];

  for (const userId of new Set(userIds)) {
    const byEndpoint = store.get(userId);
    if (byEndpoint) result.push(...byEndpoint.values());
  }

  return result;
}

export async function getSubscriptionsForUser(
  userId: string,
): Promise<StoredPushSubscription[]> {
  return getSubscriptionsForUsers([userId]);
}
