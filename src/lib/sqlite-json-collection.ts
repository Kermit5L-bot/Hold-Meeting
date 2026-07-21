import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

type SqliteValue = string | number | null;

interface SqliteStatement {
  all(...params: SqliteValue[]): unknown[];
  get(...params: SqliteValue[]): unknown;
  run(...params: SqliteValue[]): unknown;
}

interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
}

interface StoredRecordRow {
  record_id: string;
  payload: string;
}

export interface JsonCollectionConfig<T extends { id: string }> {
  name: string;
  legacyPath: string;
  seedRecords: readonly T[];
  normalize?: (record: T) => T;
}

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: new (filename: string) => SqliteDatabase;
};

const dataDir = path.join(process.cwd(), "data");
const databasePath = process.env.REGISTRATIONS_DB_PATH
  ? path.resolve(process.cwd(), process.env.REGISTRATIONS_DB_PATH)
  : path.join(dataDir, "registrations.sqlite");

function getDb() {
  const globalForDb = globalThis as typeof globalThis & {
    __holdMeetingJsonCollectionsDb?: SqliteDatabase;
  };

  if (globalForDb.__holdMeetingJsonCollectionsDb) {
    return globalForDb.__holdMeetingJsonCollectionsDb;
  }

  mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_json_records (
      collection_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      payload TEXT NOT NULL,
      PRIMARY KEY (collection_name, record_id)
    );

    CREATE INDEX IF NOT EXISTS app_json_records_collection_order
      ON app_json_records (collection_name, sort_order);

    CREATE TABLE IF NOT EXISTS app_json_migrations (
      collection_name TEXT PRIMARY KEY,
      migrated_at TEXT NOT NULL
    );
  `);

  globalForDb.__holdMeetingJsonCollectionsDb = db;
  return db;
}

function normalizeRecords<T extends { id: string }>(
  config: JsonCollectionConfig<T>,
  records: readonly T[],
) {
  const normalized = records.map((record) =>
    config.normalize ? config.normalize(record) : record,
  );
  const ids = new Set<string>();

  for (const record of normalized) {
    if (!record.id || ids.has(record.id)) {
      throw new Error(
        `集合 ${config.name} 存在空编号或重复编号，已停止写入以保护数据。`,
      );
    }
    ids.add(record.id);
  }

  return normalized;
}

function readLegacyRecords<T extends { id: string }>(
  config: JsonCollectionConfig<T>,
) {
  let raw: string;

  try {
    raw = readFileSync(config.legacyPath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return normalizeRecords(config, config.seedRecords);
    }
    throw error;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("根节点不是数组");
    }

    return normalizeRecords(config, parsed as T[]);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "未知解析错误";
    throw new Error(
      `历史数据文件 ${config.legacyPath} 解析失败，已停止迁移以保护原数据：${detail}`,
    );
  }
}

function insertRecords<T extends { id: string }>(
  db: SqliteDatabase,
  config: JsonCollectionConfig<T>,
  records: readonly T[],
) {
  const insert = db.prepare(`
    INSERT INTO app_json_records (
      collection_name,
      record_id,
      sort_order,
      payload
    ) VALUES (?, ?, ?, ?)
  `);

  records.forEach((record, index) => {
    insert.run(config.name, record.id, index, JSON.stringify(record));
  });
}

function ensureMigrated<T extends { id: string }>(
  db: SqliteDatabase,
  config: JsonCollectionConfig<T>,
) {
  const migrated = db
    .prepare(
      "SELECT collection_name FROM app_json_migrations WHERE collection_name = ?",
    )
    .get(config.name);

  if (migrated) {
    return;
  }

  const legacyRecords = readLegacyRecords(config);
  db.exec("BEGIN IMMEDIATE;");
  try {
    const migratedInsideTransaction = db
      .prepare(
        "SELECT collection_name FROM app_json_migrations WHERE collection_name = ?",
      )
      .get(config.name);

    if (!migratedInsideTransaction) {
      db.prepare("DELETE FROM app_json_records WHERE collection_name = ?").run(
        config.name,
      );
      insertRecords(db, config, legacyRecords);
      db.prepare(
        "INSERT INTO app_json_migrations (collection_name, migrated_at) VALUES (?, ?)",
      ).run(config.name, new Date().toISOString());
    }

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function readRecords<T extends { id: string }>(
  db: SqliteDatabase,
  config: JsonCollectionConfig<T>,
) {
  const rows = db
    .prepare(
      `
        SELECT record_id, payload
        FROM app_json_records
        WHERE collection_name = ?
        ORDER BY sort_order ASC
      `,
    )
    .all(config.name) as StoredRecordRow[];

  return rows.map((row) => {
    try {
      const parsed = JSON.parse(row.payload) as T;
      return config.normalize ? config.normalize(parsed) : parsed;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "未知解析错误";
      throw new Error(
        `数据库集合 ${config.name} 的记录 ${row.record_id} 无法解析：${detail}`,
      );
    }
  });
}

export function readJsonCollection<T extends { id: string }>(
  config: JsonCollectionConfig<T>,
) {
  const db = getDb();
  ensureMigrated(db, config);
  return readRecords(db, config);
}

export function mutateJsonCollection<T extends { id: string }, TResult>(
  config: JsonCollectionConfig<T>,
  mutate: (records: T[]) => { records: T[]; result: TResult },
) {
  const db = getDb();
  ensureMigrated(db, config);
  db.exec("BEGIN IMMEDIATE;");

  try {
    const currentRecords = readRecords(db, config);
    const mutation = mutate(currentRecords);
    const nextRecords = normalizeRecords(config, mutation.records);
    db.prepare("DELETE FROM app_json_records WHERE collection_name = ?").run(
      config.name,
    );
    insertRecords(db, config, nextRecords);
    db.exec("COMMIT;");
    return mutation.result;
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}
