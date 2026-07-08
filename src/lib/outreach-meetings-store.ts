import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MeetingFormValues, OutreachMeeting } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const outreachMeetingsPath = path.join(dataDir, "outreach-meetings.json");

const seedMeetings: OutreachMeeting[] = [
  {
    id: "outreach-001",
    title: "华东区域生态环境客户交流会",
    type: "outreach",
    startTime: "2026-07-18T09:30:00+08:00",
    endTime: "2026-07-18T16:30:00+08:00",
    locationType: "offline",
    location: "上海市浦东新区会议中心",
    region: "华东",
    businessUnit: "环境事业部",
    owner: "客户工作组",
    status: "published",
    notes: "示例外联会议。",
    createdAt: "2026-07-01T10:00:00+08:00",
    updatedAt: "2026-07-05T15:20:00+08:00",
    registrationEnabled: true,
    checkinEnabled: true,
    mealEnabled: true,
    coverImageUrl: "",
    enableWecomNotify: false,
    wecomWebhook: "",
    wecomGroupName: "",
    registrationCount: 0,
    checkinCount: 0,
    walkInCount: 0,
  },
  {
    id: "outreach-002",
    title: "第三方检测机构技术沙龙",
    type: "outreach",
    startTime: "2026-06-21T13:30:00+08:00",
    endTime: "2026-06-21T17:00:00+08:00",
    locationType: "offline",
    location: "广州科学城",
    region: "华南",
    businessUnit: "检测业务线",
    owner: "市场部",
    status: "ended",
    notes: "示例历史会议。",
    createdAt: "2026-06-01T09:10:00+08:00",
    updatedAt: "2026-06-22T11:00:00+08:00",
    registrationEnabled: true,
    checkinEnabled: true,
    mealEnabled: true,
    coverImageUrl: "",
    enableWecomNotify: false,
    wecomWebhook: "",
    wecomGroupName: "",
    registrationCount: 0,
    checkinCount: 0,
    walkInCount: 0,
  },
];

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(outreachMeetingsPath, "utf8");
  } catch {
    await writeFile(
      outreachMeetingsPath,
      `${JSON.stringify(seedMeetings, null, 2)}\n`,
      "utf8",
    );
  }
}

async function writeOutreachMeetings(meetings: OutreachMeeting[]) {
  await ensureDataFile();
  await writeFile(
    outreachMeetingsPath,
    `${JSON.stringify(meetings, null, 2)}\n`,
    "utf8",
  );
}

function normalizeMeeting(meeting: OutreachMeeting): OutreachMeeting {
  return {
    ...meeting,
    registrationEnabled: meeting.registrationEnabled ?? true,
    checkinEnabled: meeting.checkinEnabled ?? true,
    mealEnabled: meeting.mealEnabled ?? true,
    coverImageUrl: meeting.coverImageUrl ?? "",
    enableWecomNotify: meeting.enableWecomNotify ?? false,
    wecomWebhook: meeting.wecomWebhook ?? "",
    wecomGroupName: meeting.wecomGroupName ?? "",
    registrationCount: meeting.registrationCount ?? 0,
    checkinCount: meeting.checkinCount ?? 0,
    walkInCount: meeting.walkInCount ?? 0,
  };
}

export async function readOutreachMeetings(): Promise<OutreachMeeting[]> {
  await ensureDataFile();
  const raw = await readFile(outreachMeetingsPath, "utf8");

  try {
    const parsed = JSON.parse(raw) as OutreachMeeting[];
    return Array.isArray(parsed) ? parsed.map(normalizeMeeting) : [];
  } catch {
    return [];
  }
}

export async function findOutreachMeeting(id: string) {
  const meetings = await readOutreachMeetings();
  return meetings.find((meeting) => meeting.id === id) ?? null;
}

function toStoredDateTime(value: string) {
  return value ? `${value}:00+08:00` : "";
}

function formToOutreachMeeting(
  values: MeetingFormValues,
  existing?: OutreachMeeting,
): OutreachMeeting {
  const timestamp = new Date().toISOString();
  const enableWecomNotify = Boolean(values.enableWecomNotify);

  return {
    id:
      existing?.id ??
      `outreach-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    title: values.title.trim(),
    type: "outreach",
    startTime: toStoredDateTime(values.startTime),
    endTime: values.endTime ? toStoredDateTime(values.endTime) : undefined,
    locationType: values.locationType,
    location: values.location.trim(),
    region: values.region.trim() || undefined,
    businessUnit: values.businessUnit.trim() || undefined,
    owner: values.owner.trim() || undefined,
    status: values.status,
    notes: values.notes.trim() || undefined,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    registrationEnabled: existing?.registrationEnabled ?? true,
    checkinEnabled: existing?.checkinEnabled ?? true,
    mealEnabled: existing?.mealEnabled ?? true,
    coverImageUrl: values.coverImageUrl.trim() || undefined,
    enableWecomNotify,
    wecomWebhook: enableWecomNotify ? values.wecomWebhook.trim() : "",
    wecomGroupName: values.wecomGroupName.trim() || undefined,
    registrationCount: existing?.registrationCount ?? 0,
    checkinCount: existing?.checkinCount ?? 0,
    walkInCount: existing?.walkInCount ?? 0,
  };
}

export async function createOutreachMeeting(values: MeetingFormValues) {
  const meetings = await readOutreachMeetings();
  const meeting = formToOutreachMeeting(values);
  await writeOutreachMeetings([meeting, ...meetings]);
  return meeting;
}

export async function updateOutreachMeeting(
  id: string,
  values: MeetingFormValues,
) {
  const meetings = await readOutreachMeetings();
  const existing = meetings.find((meeting) => meeting.id === id);

  if (!existing) {
    return null;
  }

  const nextMeeting = formToOutreachMeeting(values, existing);
  await writeOutreachMeetings(
    meetings.map((meeting) => (meeting.id === id ? nextMeeting : meeting)),
  );
  return nextMeeting;
}

export async function deleteOutreachMeeting(id: string) {
  const meetings = await readOutreachMeetings();
  await writeOutreachMeetings(meetings.filter((meeting) => meeting.id !== id));
}

export async function appendImportedOutreachMeetings(
  importedMeetings: OutreachMeeting[],
) {
  const meetings = await readOutreachMeetings();
  await writeOutreachMeetings([...importedMeetings, ...meetings]);
  return importedMeetings;
}
