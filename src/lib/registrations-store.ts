import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type {
  CheckinMethod,
  CheckinStatus,
  MealPreference,
  OrganizationType,
  Registration,
  RegistrationFormValues,
  RegistrationSource,
  RegistrationStatus,
  WecomNotifyStatus,
} from "@/lib/types";

type SqliteValue = string | number | null;

interface SqliteStatement {
  all(...params: SqliteValue[]): unknown[];
  get(...params: SqliteValue[]): unknown;
  run(...params: SqliteValue[]): unknown;
}

interface SqliteDatabase {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
}

interface RegistrationRow {
  id: string;
  meeting_id: string;
  status: RegistrationStatus;
  source: RegistrationSource;
  registered_at: string;
  created_at: string;
  updated_at: string;
  checkin_status: CheckinStatus;
  checkin_at: string | null;
  checkin_method: CheckinMethod | null;
  is_walk_in: number;
  name: string;
  organization_type: OrganizationType;
  other_organization_type: string | null;
  organization_name: string;
  position: string | null;
  phone: string;
  meal: MealPreference;
  notes: string | null;
  import_key: string | null;
  imported_at: string | null;
  import_batch_id: string | null;
  wecom_notify_status: WecomNotifyStatus | null;
  wecom_notify_error: string | null;
}

export type WecomNotificationKind = "registration" | "walk_in_checkin";
export type WecomNotificationJobStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "skipped"
  | "dead";

interface WecomNotificationJobRow {
  id: string;
  registration_id: string;
  meeting_id: string;
  kind: WecomNotificationKind;
  status: WecomNotificationJobStatus;
  attempt_count: number;
  next_attempt_at: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
}

export interface WecomNotificationJob {
  id: string;
  registrationId: string;
  meetingId: string;
  kind: WecomNotificationKind;
  status: WecomNotificationJobStatus;
  attemptCount: number;
  nextAttemptAt: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  claimedAt?: string;
}

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: new (filename: string) => SqliteDatabase;
};

const dataDir = path.join(process.cwd(), "data");
const registrationsDbPath = process.env.REGISTRATIONS_DB_PATH
  ? path.resolve(process.cwd(), process.env.REGISTRATIONS_DB_PATH)
  : path.join(dataDir, "registrations.sqlite");
const legacyRegistrationsPath = path.join(dataDir, "registrations.json");

function ensureDataDir() {
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(path.dirname(registrationsDbPath), { recursive: true });
}

function getDb() {
  const globalForDb = globalThis as typeof globalThis & {
    __holdMeetingRegistrationsDb?: SqliteDatabase;
  };

  if (globalForDb.__holdMeetingRegistrationsDb) {
    return globalForDb.__holdMeetingRegistrationsDb;
  }

  ensureDataDir();
  const db = new DatabaseSync(registrationsDbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      registered_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      checkin_status TEXT NOT NULL,
      checkin_at TEXT,
      checkin_method TEXT,
      is_walk_in INTEGER NOT NULL DEFAULT 0,
      name TEXT NOT NULL,
      organization_type TEXT NOT NULL,
      other_organization_type TEXT,
      organization_name TEXT NOT NULL,
      position TEXT,
      phone TEXT NOT NULL,
      meal TEXT NOT NULL,
      notes TEXT,
      import_key TEXT,
      imported_at TEXT,
      import_batch_id TEXT,
      wecom_notify_status TEXT,
      wecom_notify_error TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS registrations_unique_active_phone
      ON registrations (meeting_id, phone)
      WHERE status = 'registered';

    CREATE INDEX IF NOT EXISTS registrations_meeting_registered_at
      ON registrations (meeting_id, registered_at);

    CREATE INDEX IF NOT EXISTS registrations_import_key
      ON registrations (import_key);

    CREATE TABLE IF NOT EXISTS wecom_notification_jobs (
      id TEXT PRIMARY KEY,
      registration_id TEXT NOT NULL,
      meeting_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      claimed_at TEXT,
      UNIQUE (registration_id, kind)
    );

    CREATE INDEX IF NOT EXISTS wecom_notification_jobs_due
      ON wecom_notification_jobs (status, next_attempt_at);

    CREATE TABLE IF NOT EXISTS app_data_migrations (
      migration_key TEXT PRIMARY KEY,
      migrated_at TEXT NOT NULL
    );
  `);

  try {
    migrateLegacyJsonIfNeeded(db);
  } catch (error) {
    db.close();
    throw error;
  }

  globalForDb.__holdMeetingRegistrationsDb = db;
  return db;
}

function migrateLegacyJsonIfNeeded(db: SqliteDatabase) {
  const migrationKey = "registrations-json-v1";
  const migrated = db
    .prepare("SELECT migration_key FROM app_data_migrations WHERE migration_key = ?")
    .get(migrationKey);

  if (migrated) {
    return;
  }

  let legacyRegistrations: Registration[] = [];

  if (existsSync(legacyRegistrationsPath)) {
    const raw = readFileSync(legacyRegistrationsPath, "utf8");
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "未知解析错误";
      throw new Error(
        `历史报名数据文件 ${legacyRegistrationsPath} 解析失败，已停止迁移以保护原数据：${detail}`,
      );
    }

    if (!Array.isArray(parsed)) {
      throw new Error(
        `历史报名数据文件 ${legacyRegistrationsPath} 格式无效，已停止迁移以保护原数据。`,
      );
    }

    legacyRegistrations = parsed as Registration[];
  }

  db.exec("BEGIN IMMEDIATE;");
  try {
    const migratedInsideTransaction = db
      .prepare("SELECT migration_key FROM app_data_migrations WHERE migration_key = ?")
      .get(migrationKey);

    if (!migratedInsideTransaction) {
      const countRow = db
        .prepare("SELECT COUNT(*) AS count FROM registrations")
        .get() as { count: number } | undefined;

      if ((countRow?.count ?? 0) === 0) {
        const insert = db.prepare(insertRegistrationSql());
        for (const registration of legacyRegistrations) {
          insert.run(...registrationParams(normalizeRegistration(registration)));
        }
      }

      db.prepare(
        "INSERT INTO app_data_migrations (migration_key, migrated_at) VALUES (?, ?)",
      ).run(migrationKey, new Date().toISOString());
    }

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function insertRegistrationSql(conflictClause = "") {
  return `
    INSERT ${conflictClause} INTO registrations (
      id,
      meeting_id,
      status,
      source,
      registered_at,
      created_at,
      updated_at,
      checkin_status,
      checkin_at,
      checkin_method,
      is_walk_in,
      name,
      organization_type,
      other_organization_type,
      organization_name,
      position,
      phone,
      meal,
      notes,
      import_key,
      imported_at,
      import_batch_id,
      wecom_notify_status,
      wecom_notify_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
}

function normalizeRegistration(registration: Registration): Registration {
  return {
    ...registration,
    phone: normalizePhone(registration.phone),
    checkinStatus: registration.checkinStatus ?? "not_checked_in",
    isWalkIn:
      registration.isWalkIn ?? registration.source === "walk_in",
    wecomNotifyStatus: registration.wecomNotifyStatus ?? "not_sent",
  };
}

function rowToRegistration(row: RegistrationRow): Registration {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    status: row.status,
    source: row.source,
    registeredAt: row.registered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    checkinStatus: row.checkin_status,
    checkinAt: row.checkin_at ?? undefined,
    checkinMethod: row.checkin_method ?? undefined,
    isWalkIn: Boolean(row.is_walk_in),
    name: row.name,
    organizationType: row.organization_type,
    otherOrganizationType: row.other_organization_type ?? undefined,
    organizationName: row.organization_name,
    position: row.position ?? undefined,
    phone: row.phone,
    meal: row.meal,
    notes: row.notes ?? undefined,
    importKey: row.import_key ?? undefined,
    importedAt: row.imported_at ?? undefined,
    importBatchId: row.import_batch_id ?? undefined,
    wecomNotifyStatus: row.wecom_notify_status ?? "not_sent",
    wecomNotifyError: row.wecom_notify_error ?? undefined,
  };
}

function registrationParams(registration: Registration): SqliteValue[] {
  return [
    registration.id,
    registration.meetingId,
    registration.status,
    registration.source,
    registration.registeredAt,
    registration.createdAt,
    registration.updatedAt,
    registration.checkinStatus,
    registration.checkinAt ?? null,
    registration.checkinMethod ?? null,
    registration.isWalkIn ? 1 : 0,
    registration.name,
    registration.organizationType,
    registration.otherOrganizationType ?? null,
    registration.organizationName,
    registration.position ?? null,
    normalizePhone(registration.phone),
    registration.meal,
    registration.notes ?? null,
    registration.importKey ?? null,
    registration.importedAt ?? null,
    registration.importBatchId ?? null,
    registration.wecomNotifyStatus ?? "not_sent",
    registration.wecomNotifyError ?? null,
  ];
}

function rowToWecomNotificationJob(
  row: WecomNotificationJobRow,
): WecomNotificationJob {
  return {
    id: row.id,
    registrationId: row.registration_id,
    meetingId: row.meeting_id,
    kind: row.kind,
    status: row.status,
    attemptCount: row.attempt_count,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    claimedAt: row.claimed_at ?? undefined,
  };
}

function insertWecomNotificationJob(
  db: SqliteDatabase,
  registration: Registration,
) {
  const timestamp = new Date().toISOString();
  const kind: WecomNotificationKind =
    registration.source === "walk_in" ? "walk_in_checkin" : "registration";

  db.prepare(
    `
      INSERT OR IGNORE INTO wecom_notification_jobs (
        id,
        registration_id,
        meeting_id,
        kind,
        status,
        attempt_count,
        next_attempt_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)
    `,
  ).run(
    `wecom-job-${randomUUID()}`,
    registration.id,
    registration.meetingId,
    kind,
    timestamp,
    timestamp,
    timestamp,
  );
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("UNIQUE constraint failed") ||
      error.message.includes("SQLITE_CONSTRAINT"))
  );
}

export async function readRegistrations(): Promise<Registration[]> {
  const rows = getDb()
    .prepare("SELECT * FROM registrations ORDER BY registered_at DESC")
    .all() as RegistrationRow[];
  return rows.map(rowToRegistration);
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function maskPhone(phone: string) {
  const normalized = normalizePhone(phone);

  if (normalized.length < 7) {
    return normalized;
  }

  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

export async function listRegistrationsByMeeting(meetingId: string) {
  const rows = getDb()
    .prepare(
      `
        SELECT *
        FROM registrations
        WHERE meeting_id = ?
        ORDER BY registered_at DESC
      `,
    )
    .all(meetingId) as RegistrationRow[];
  return rows.map(rowToRegistration);
}

export async function findRegistrationByMeetingAndPhone(
  meetingId: string,
  phone: string,
) {
  const row = getDb()
    .prepare(
      `
        SELECT *
        FROM registrations
        WHERE meeting_id = ?
          AND phone = ?
          AND status = 'registered'
        LIMIT 1
      `,
    )
    .get(meetingId, normalizePhone(phone)) as RegistrationRow | undefined;

  return row ? rowToRegistration(row) : undefined;
}

export async function findRegistrationById(registrationId: string) {
  const row = getDb()
    .prepare("SELECT * FROM registrations WHERE id = ? LIMIT 1")
    .get(registrationId) as RegistrationRow | undefined;

  return row ? rowToRegistration(row) : undefined;
}

export async function createRegistration(
  values: RegistrationFormValues,
  source: RegistrationSource = "pre_meeting",
  checkin?: {
    status: "checked_in";
    method: CheckinMethod;
    isWalkIn: boolean;
  },
) {
  const timestamp = new Date().toISOString();
  const registration: Registration = {
    id: `reg-${randomUUID()}`,
    meetingId: values.meetingId,
    status: "registered",
    source,
    registeredAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    checkinStatus: checkin?.status ?? "not_checked_in",
    checkinAt: checkin?.status === "checked_in" ? timestamp : undefined,
    checkinMethod: checkin?.method,
    isWalkIn: checkin?.isWalkIn ?? source === "walk_in",
    name: values.name.trim(),
    organizationType: values.organizationType || "other",
    otherOrganizationType:
      values.organizationType === "other"
        ? values.otherOrganizationType.trim()
        : undefined,
    organizationName: values.organizationName.trim(),
    position: values.position.trim() || undefined,
    phone: normalizePhone(values.phone),
    meal: values.meal || "no",
    notes: values.notes.trim() || undefined,
    wecomNotifyStatus: "not_sent",
  };

  const db = getDb();

  try {
    db.exec("BEGIN IMMEDIATE;");
    db.prepare(insertRegistrationSql()).run(...registrationParams(registration));
    insertWecomNotificationJob(db, registration);
    db.exec("COMMIT;");
  } catch (error) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // The insert may fail before SQLite opens the transaction.
    }

    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const duplicated = await findRegistrationByMeetingAndPhone(
      values.meetingId,
      values.phone,
    );

    return {
      ok: false as const,
      reason: "duplicate" as const,
      registration: duplicated ?? registration,
    };
  }

  return {
    ok: true as const,
    registration,
  };
}

export async function confirmCheckin(
  meetingId: string,
  phone: string,
  method: CheckinMethod = "wechat_scan",
) {
  const db = getDb();
  const normalizedPhone = normalizePhone(phone);
  const row = db
    .prepare(
      `
        SELECT *
        FROM registrations
        WHERE meeting_id = ?
          AND phone = ?
          AND status = 'registered'
        LIMIT 1
      `,
    )
    .get(meetingId, normalizedPhone) as RegistrationRow | undefined;

  if (!row) {
    return {
      ok: false as const,
      reason: "not_found" as const,
    };
  }

  const registration = rowToRegistration(row);

  if (registration.checkinStatus === "checked_in") {
    return {
      ok: false as const,
      reason: "already_checked_in" as const,
      registration,
    };
  }

  const timestamp = new Date().toISOString();
  const result = db
    .prepare(
      `
        UPDATE registrations
        SET checkin_status = 'checked_in',
            checkin_at = ?,
            checkin_method = ?,
            updated_at = ?
        WHERE id = ?
          AND checkin_status <> 'checked_in'
      `,
    )
    .run(timestamp, method, timestamp, registration.id) as { changes?: number };

  if (result.changes === 0) {
    const latest = await findRegistrationById(registration.id);
    return {
      ok: false as const,
      reason: "already_checked_in" as const,
      registration: latest ?? registration,
    };
  }

  return {
    ok: true as const,
    registration: {
      ...registration,
      checkinStatus: "checked_in",
      checkinAt: timestamp,
      checkinMethod: method,
      updatedAt: timestamp,
    },
  };
}

export async function createWalkInRegistrationAndCheckin(
  values: RegistrationFormValues,
) {
  return createRegistration(values, "walk_in", {
    status: "checked_in",
    method: "wechat_scan",
    isWalkIn: true,
  });
}

export async function claimDueWecomNotificationJobs(
  limit = 10,
  now = new Date(),
) {
  const db = getDb();
  const nowIso = now.toISOString();
  const staleBefore = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));

  db.exec("BEGIN IMMEDIATE;");
  try {
    db.prepare(
      `
        UPDATE wecom_notification_jobs
        SET status = 'pending',
            claimed_at = NULL,
            next_attempt_at = ?,
            updated_at = ?
        WHERE status = 'processing'
          AND claimed_at < ?
      `,
    ).run(nowIso, nowIso, staleBefore);

    const rows = db
      .prepare(
        `
          SELECT *
          FROM wecom_notification_jobs
          WHERE status = 'pending'
            AND next_attempt_at <= ?
          ORDER BY next_attempt_at ASC, created_at ASC
          LIMIT ?
        `,
      )
      .all(nowIso, safeLimit) as WecomNotificationJobRow[];

    const claim = db.prepare(
      `
        UPDATE wecom_notification_jobs
        SET status = 'processing',
            attempt_count = attempt_count + 1,
            claimed_at = ?,
            updated_at = ?
        WHERE id = ?
          AND status = 'pending'
      `,
    );

    const jobs: WecomNotificationJob[] = [];
    for (const row of rows) {
      const result = claim.run(nowIso, nowIso, row.id) as { changes?: number };
      if (result.changes) {
        jobs.push(
          rowToWecomNotificationJob({
            ...row,
            status: "processing",
            attempt_count: row.attempt_count + 1,
            claimed_at: nowIso,
            updated_at: nowIso,
          }),
        );
      }
    }

    db.exec("COMMIT;");
    return jobs;
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export async function completeWecomNotificationJob(
  job: WecomNotificationJob,
  sent: boolean,
) {
  const db = getDb();
  const timestamp = new Date().toISOString();

  db.exec("BEGIN IMMEDIATE;");
  try {
    db.prepare(
      `
        UPDATE wecom_notification_jobs
        SET status = ?,
            claimed_at = NULL,
            last_error = NULL,
            updated_at = ?
        WHERE id = ?
      `,
    ).run(sent ? "succeeded" : "skipped", timestamp, job.id);

    if (sent) {
      db.prepare(
        `
          UPDATE registrations
          SET wecom_notify_status = 'success',
              wecom_notify_error = NULL,
              updated_at = ?
          WHERE id = ?
        `,
      ).run(timestamp, job.registrationId);
    }

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export async function listWecomNotificationJobsByMeeting(meetingId: string) {
  const rows = getDb()
    .prepare(
      `
        SELECT *
        FROM wecom_notification_jobs
        WHERE meeting_id = ?
        ORDER BY created_at DESC
      `,
    )
    .all(meetingId) as WecomNotificationJobRow[];
  return rows.map(rowToWecomNotificationJob);
}

export async function retryFailedWecomNotificationJobs(meetingId: string) {
  const db = getDb();
  const timestamp = new Date().toISOString();

  db.exec("BEGIN IMMEDIATE;");
  try {
    const deadJobs = db
      .prepare(
        `
          SELECT registration_id
          FROM wecom_notification_jobs
          WHERE meeting_id = ?
            AND status = 'dead'
        `,
      )
      .all(meetingId) as Array<{ registration_id: string }>;

    db.prepare(
      `
        UPDATE wecom_notification_jobs
        SET status = 'pending',
            attempt_count = 0,
            next_attempt_at = ?,
            claimed_at = NULL,
            last_error = NULL,
            updated_at = ?
        WHERE meeting_id = ?
          AND status = 'dead'
      `,
    ).run(timestamp, timestamp, meetingId);

    const legacyFailures = db
      .prepare(
        `
          SELECT id, source
          FROM registrations
          WHERE meeting_id = ?
            AND status = 'registered'
            AND wecom_notify_status = 'failed'
            AND NOT EXISTS (
              SELECT 1
              FROM wecom_notification_jobs jobs
              WHERE jobs.registration_id = registrations.id
            )
        `,
      )
      .all(meetingId) as Array<{
      id: string;
      source: RegistrationSource;
    }>;

    const insertJob = db.prepare(
      `
        INSERT INTO wecom_notification_jobs (
          id,
          registration_id,
          meeting_id,
          kind,
          status,
          attempt_count,
          next_attempt_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)
      `,
    );
    for (const registration of legacyFailures) {
      const kind: WecomNotificationKind =
        registration.source === "walk_in"
          ? "walk_in_checkin"
          : "registration";
      insertJob.run(
        `wecom-job-${randomUUID()}`,
        registration.id,
        meetingId,
        kind,
        timestamp,
        timestamp,
        timestamp,
      );
    }

    const registrationIds = [
      ...deadJobs.map((job) => job.registration_id),
      ...legacyFailures.map((registration) => registration.id),
    ];
    const resetRegistration = db.prepare(
      `
        UPDATE registrations
        SET wecom_notify_status = 'not_sent',
            wecom_notify_error = NULL,
            updated_at = ?
        WHERE id = ?
      `,
    );
    for (const registrationId of registrationIds) {
      resetRegistration.run(timestamp, registrationId);
    }

    db.exec("COMMIT;");
    return registrationIds.length;
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export async function failWecomNotificationJob(
  job: WecomNotificationJob,
  error: string,
  nextAttemptAt: Date | null,
) {
  const db = getDb();
  const timestamp = new Date().toISOString();
  const status: WecomNotificationJobStatus = nextAttemptAt ? "pending" : "dead";

  db.exec("BEGIN IMMEDIATE;");
  try {
    db.prepare(
      `
        UPDATE wecom_notification_jobs
        SET status = ?,
            next_attempt_at = ?,
            claimed_at = NULL,
            last_error = ?,
            updated_at = ?
        WHERE id = ?
      `,
    ).run(status, nextAttemptAt?.toISOString() ?? timestamp, error, timestamp, job.id);

    db.prepare(
      `
        UPDATE registrations
        SET wecom_notify_status = 'failed',
            wecom_notify_error = ?,
            updated_at = ?
        WHERE id = ?
      `,
    ).run(error, timestamp, job.registrationId);

    db.exec("COMMIT;");
  } catch (failure) {
    db.exec("ROLLBACK;");
    throw failure;
  }
}

export async function appendImportedRegistrations(
  importedRegistrations: Registration[],
) {
  const db = getDb();
  const insert = db.prepare(insertRegistrationSql());

  db.exec("BEGIN IMMEDIATE;");
  try {
    for (const registration of importedRegistrations) {
      insert.run(...registrationParams(normalizeRegistration(registration)));
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    if (isUniqueConstraintError(error)) {
      throw new Error("报名数据已发生变化，请重新预览后再导入。");
    }
    throw error;
  }

  return importedRegistrations;
}
