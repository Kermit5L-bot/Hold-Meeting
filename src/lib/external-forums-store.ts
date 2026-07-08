import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ExternalForumFormValues,
  ExternalForumRecord,
} from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const externalForumsPath = path.join(dataDir, "external-forums.json");

const seedRecords: ExternalForumRecord[] = [
  {
    id: "forum-record-001",
    title: "中国环境监测产业发展论坛",
    organizer: "行业协会",
    meetingTime: "2026-05-12T09:00:00+08:00",
    location: "北京国际会议中心",
    attendees: ["李明", "周岚"],
    hasSpeech: true,
    speechTopic: "生态环境数字化监测实践",
    speaker: "李明",
    cost: 36000,
    costType: "sponsorship_fee",
    businessUnit: "环境事业部",
    sponsored: true,
    sponsorshipType: "论坛协办及展位",
    purposes: ["brand_exposure", "industry_exchange"],
    outputs: ["press_release", "photo"],
    followUp: "整理参会客户名单并同步销售运营。",
    notes: "年度重点行业论坛。",
    createdAt: "2026-04-20T08:30:00+08:00",
    updatedAt: "2026-05-15T18:20:00+08:00",
  },
  {
    id: "forum-record-002",
    title: "高校实验室安全与运维研讨会",
    organizer: "高校联盟",
    meetingTime: "2026-04-08T10:00:00+08:00",
    location: "南京",
    attendees: ["陈洁"],
    hasSpeech: false,
    cost: 4800,
    costType: "registration_fee",
    businessUnit: "教育行业线",
    sponsored: false,
    purposes: ["learning_research", "customer_maintenance"],
    outputs: ["minutes"],
    createdAt: "2026-03-28T14:00:00+08:00",
    updatedAt: "2026-04-09T12:10:00+08:00",
  },
];

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(externalForumsPath, "utf8");
  } catch {
    await writeFile(
      externalForumsPath,
      `${JSON.stringify(seedRecords, null, 2)}\n`,
      "utf8",
    );
  }
}

async function writeExternalForums(records: ExternalForumRecord[]) {
  await ensureDataFile();
  await writeFile(
    externalForumsPath,
    `${JSON.stringify(records, null, 2)}\n`,
    "utf8",
  );
}

export async function readExternalForums(): Promise<ExternalForumRecord[]> {
  await ensureDataFile();
  const raw = await readFile(externalForumsPath, "utf8");

  try {
    const parsed = JSON.parse(raw) as ExternalForumRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function splitAttendees(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formToRecord(
  values: ExternalForumFormValues,
  existing?: ExternalForumRecord,
): ExternalForumRecord {
  const timestamp = new Date().toISOString();
  const hasSpeech = values.hasSpeech === "yes";
  const sponsored = values.sponsored === "yes";
  const costValue = Number(values.cost);

  return {
    id:
      existing?.id ??
      `forum-record-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    title: values.title.trim(),
    organizer: values.organizer.trim(),
    meetingTime: values.meetingTime
      ? `${values.meetingTime}:00+08:00`
      : timestamp,
    location: values.location.trim(),
    attendees: splitAttendees(values.attendeesText),
    hasSpeech,
    speechTopic: hasSpeech ? values.speechTopic.trim() : undefined,
    speaker: hasSpeech ? values.speaker.trim() : undefined,
    cost: values.cost.trim() ? costValue : undefined,
    costType: values.costType || undefined,
    businessUnit: values.businessUnit.trim(),
    sponsored,
    sponsorshipType: sponsored ? values.sponsorshipType.trim() : undefined,
    purposes: values.purposes,
    outputs: values.outputs,
    followUp: values.followUp.trim() || undefined,
    notes: values.notes.trim() || undefined,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export async function createExternalForum(values: ExternalForumFormValues) {
  const records = await readExternalForums();
  const record = formToRecord(values);
  await writeExternalForums([record, ...records]);
  return record;
}

export async function updateExternalForum(
  id: string,
  values: ExternalForumFormValues,
) {
  const records = await readExternalForums();
  const existing = records.find((record) => record.id === id);

  if (!existing) {
    return null;
  }

  const nextRecord = formToRecord(values, existing);
  await writeExternalForums(
    records.map((record) => (record.id === id ? nextRecord : record)),
  );
  return nextRecord;
}

export async function deleteExternalForum(id: string) {
  const records = await readExternalForums();
  await writeExternalForums(records.filter((record) => record.id !== id));
}

export async function appendImportedExternalForums(
  importedRecords: ExternalForumRecord[],
) {
  const records = await readExternalForums();
  await writeExternalForums([...importedRecords, ...records]);
  return importedRecords;
}
