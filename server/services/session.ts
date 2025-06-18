import Keyv from "keyv";
import KeyvSqlite from "@keyv/sqlite";

async function makeCache() {
  const store = new KeyvSqlite({
    table: "cache",
    db: "cache.sqlite",
    busyTimeout: 10000,
  });

  const keyv = new Keyv({ store });

  keyv.on("error", (err) => {
    console.error("Cache error:", err);
  });

  return keyv;
}

const cachePromise = makeCache();

// Create or update a session with TTL in seconds
export async function createSession(sessionId: string, expiresAt: number) {
  const cache = await cachePromise;
  const ttlSeconds = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  await cache.set(sessionId, {}, ttlSeconds);
}

// Check existence (expired entries auto-removed)
export async function isValidSession(sessionId: string) {
  const cache = await cachePromise;
  return (await cache.get(sessionId)) != null;
}

// Delete immediately
export async function deleteSession(sessionId: string) {
  const cache = await cachePromise;
  await cache.delete(sessionId);
}
