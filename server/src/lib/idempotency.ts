import { createHash, randomUUID } from "node:crypto";
import type { Request } from "express";

export type StoredIdempotencyResponse = {
  statusCode: number;
  body: unknown;
};

export type StoredIdempotencyRecord = {
  requestKey: string;
  scope: string;
  method: string;
  path: string;
  bodyFingerprint: string;
  statusCode: number | null;
  responseBody: unknown | null;
};

export type IdempotencyReservation =
  | { kind: "reserved" }
  | { kind: "existing"; record: StoredIdempotencyRecord };

export type IdempotencyStore = {
  reserve: (record: Omit<StoredIdempotencyRecord, "statusCode" | "responseBody">) => Promise<IdempotencyReservation>;
  complete: (requestKey: string, scope: string, response: StoredIdempotencyResponse) => Promise<void>;
  failCompletion: (requestKey: string, scope: string) => Promise<void>;
  abandon: (requestKey: string, scope: string) => Promise<void>;
};

export type PrismaIdempotencyDb = {
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<number>;
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(",")}}`;
};

export const createIdempotencyFingerprint = (request: Pick<Request, "method" | "originalUrl" | "body">) => {
  const path = request.originalUrl.split("?")[0] ?? request.originalUrl;
  const method = request.method.toUpperCase();
  const body = stableStringify(request.body ?? null);
  const bodyFingerprint = createHash("sha256").update(body).digest("hex");

  return { method, path, bodyFingerprint };
};

export const isIdempotencyConflict = (record: StoredIdempotencyRecord, fingerprint: Omit<StoredIdempotencyRecord, "requestKey" | "scope" | "statusCode" | "responseBody">) =>
  record.method !== fingerprint.method || record.path !== fingerprint.path || record.bodyFingerprint !== fingerprint.bodyFingerprint;

export const createMemoryIdempotencyStore = (): IdempotencyStore => {
  const records = new Map<string, StoredIdempotencyRecord>();
  const recordKey = (requestKey: string, scope: string) => `${scope}\u0000${requestKey}`;

  return {
    async reserve(record) {
      const key = recordKey(record.requestKey, record.scope);
      const existing = records.get(key);
      if (existing) return { kind: "existing", record: existing };

      records.set(key, { ...record, statusCode: null, responseBody: null });
      return { kind: "reserved" };
    },
    async complete(requestKey, scope, response) {
      const key = recordKey(requestKey, scope);
      const existing = records.get(key);
      if (!existing) throw new Error("Idempotency reservation was not found.");
      records.set(key, { ...existing, statusCode: response.statusCode, responseBody: response.body });
    },
    async failCompletion(requestKey, scope) {
      const key = recordKey(requestKey, scope);
      const existing = records.get(key);
      if (!existing || existing.statusCode !== null) return;
      records.set(key, { ...existing, statusCode: 500, responseBody: { message: "Idempotent request completed, but its replay response could not be stored." } });
    },
    async abandon(requestKey, scope) {
      const key = recordKey(requestKey, scope);
      const existing = records.get(key);
      if (existing?.statusCode === null) records.delete(key);
    },
  };
};

export const createPrismaIdempotencyStore = (db: PrismaIdempotencyDb): IdempotencyStore => {
  const readExisting = async (requestKey: string, scope: string) => {
    const rows = await db.$queryRawUnsafe<StoredIdempotencyRecord[]>(
      `SELECT "requestKey", "scope", "method", "path", "bodyFingerprint", "statusCode", "responseBody" FROM "IdempotencyRecord" WHERE "requestKey" = $1 AND "scope" = $2 LIMIT 1`,
      requestKey,
      scope,
    );

    return rows[0] ?? null;
  };

  return {
    async reserve(record) {
      try {
        await db.$executeRawUnsafe(
          `INSERT INTO "IdempotencyRecord" ("id", "requestKey", "scope", "method", "path", "bodyFingerprint", "statusCode", "responseBody", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, CURRENT_TIMESTAMP)`,
          randomUUID(),
          record.requestKey,
          record.scope,
          record.method,
          record.path,
          record.bodyFingerprint,
        );
        return { kind: "reserved" };
      } catch {
        const existing = await readExisting(record.requestKey, record.scope);
        if (!existing) throw new Error("Idempotency reservation failed without an existing record.");
        return { kind: "existing", record: existing };
      }
    },
    async complete(requestKey, scope, response) {
      await db.$executeRawUnsafe(
        `UPDATE "IdempotencyRecord" SET "statusCode" = $3, "responseBody" = $4::jsonb, "updatedAt" = CURRENT_TIMESTAMP WHERE "requestKey" = $1 AND "scope" = $2`,
        requestKey,
        scope,
        response.statusCode,
        JSON.stringify(response.body),
      );
    },
    async failCompletion(requestKey, scope) {
      await db.$executeRawUnsafe(
        `UPDATE "IdempotencyRecord" SET "statusCode" = 500, "responseBody" = $3::jsonb, "updatedAt" = CURRENT_TIMESTAMP WHERE "requestKey" = $1 AND "scope" = $2 AND "statusCode" IS NULL`,
        requestKey,
        scope,
        JSON.stringify({ message: "Idempotent request completed, but its replay response could not be stored." }),
      );
    },
    async abandon(requestKey, scope) {
      await db.$executeRawUnsafe(
        `DELETE FROM "IdempotencyRecord" WHERE "requestKey" = $1 AND "scope" = $2 AND "statusCode" IS NULL`,
        requestKey,
        scope,
      );
    },
  };
};

export const runIdempotentCreate = async (input: {
  request: Request;
  scope: string;
  store?: IdempotencyStore;
  execute: () => Promise<StoredIdempotencyResponse>;
}): Promise<StoredIdempotencyResponse> => {
  const requestKey = input.request.header("Idempotency-Key")?.trim();
  if (!requestKey || !input.store) return input.execute();

  const fingerprint = createIdempotencyFingerprint(input.request);
  const reservation = await input.store.reserve({ requestKey, scope: input.scope, ...fingerprint });

  if (reservation.kind === "existing") {
    if (isIdempotencyConflict(reservation.record, fingerprint)) {
      return { statusCode: 409, body: { message: "Idempotency-Key was already used for a different request." } };
    }

    if (reservation.record.statusCode === null) {
      return { statusCode: 409, body: { message: "Idempotency-Key request is already in progress." } };
    }

    return { statusCode: reservation.record.statusCode, body: reservation.record.responseBody };
  }

  let response: StoredIdempotencyResponse;
  try {
    response = await input.execute();
  } catch (error) {
    await input.store.abandon(requestKey, input.scope);
    throw error;
  }

  try {
    await input.store.complete(requestKey, input.scope, response);
  } catch (error) {
    await input.store.failCompletion(requestKey, input.scope);
    throw error;
  }
  return response;
};
