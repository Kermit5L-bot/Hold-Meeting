import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  mutateJsonCollection,
  readJsonCollection,
  type JsonCollectionConfig,
} from "@/lib/sqlite-json-collection";
import type { MeetingFormValues, OutreachMeeting } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const outreachMeetingsPath = path.join(dataDir, "outreach-meetings.json");
const legacyOwnerUserId = "admin-super-001";

const seedMeetings: OutreachMeeting[] = [
  {
    id: "outreach-001",
    ownerUserId: legacyOwnerUserId,
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
    enableWecomCheckinSummaryNotify: false,
    wecomCheckinSummaryIntervalMinutes: 15,
    registrationCount: 0,
    checkinCount: 0,
    walkInCount: 0,
  },
  {
    id: "outreach-002",
    ownerUserId: legacyOwnerUserId,
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
    enableWecomCheckinSummaryNotify: false,
    wecomCheckinSummaryIntervalMinutes: 15,
    registrationCount: 0,
    checkinCount: 0,
    walkInCount: 0,
  },
];

function normalizeMeeting(meeting: OutreachMeeting): OutreachMeeting {
  return {
    ...meeting,
    ownerUserId: meeting.ownerUserId || legacyOwnerUserId,
    registrationEnabled: meeting.registrationEnabled ?? true,
    checkinEnabled: meeting.checkinEnabled ?? true,
    mealEnabled: meeting.mealEnabled ?? true,
    coverImageUrl: meeting.coverImageUrl ?? "",
    enableWecomNotify: meeting.enableWecomNotify ?? false,
    wecomWebhook: meeting.wecomWebhook ?? "",
    wecomGroupName: meeting.wecomGroupName ?? "",
    enableWecomCheckinSummaryNotify:
      meeting.enableWecomCheckinSummaryNotify ?? false,
    wecomCheckinSummaryIntervalMinutes:
      meeting.wecomCheckinSummaryIntervalMinutes ?? 15,
    registrationCount: meeting.registrationCount ?? 0,
    checkinCount: meeting.checkinCount ?? 0,
    walkInCount: meeting.walkInCount ?? 0,
  };
}

const outreachMeetingsCollection: JsonCollectionConfig<OutreachMeeting> = {
  name: "outreach-meetings",
  legacyPath: outreachMeetingsPath,
  seedRecords: seedMeetings,
  normalize: normalizeMeeting,
};

export async function readOutreachMeetings(): Promise<OutreachMeeting[]> {
  return readJsonCollection(outreachMeetingsCollection);
}

export function persistOutreachOwnershipMigration() {
  return mutateJsonCollection(outreachMeetingsCollection, (records) => ({ records, result: undefined }));
}

export async function findOutreachMeeting(id: string) {
  const meetings = await readOutreachMeetings();
  return meetings.find((meeting) => meeting.id === id) ?? null;
}

function toStoredDateTime(value: string) {
  if (!value) return "";
  return `${value.length === 16 ? `${value}:00` : value}+08:00`;
}

function formToOutreachMeeting(
  values: MeetingFormValues,
  ownerUserId: string,
  existing?: OutreachMeeting,
): OutreachMeeting {
  const timestamp = new Date().toISOString();
  const enableWecomNotify = Boolean(values.enableWecomNotify);
  const enableWecomCheckinSummaryNotify = Boolean(
    values.enableWecomNotify &&
      values.wecomWebhook.trim() &&
      values.enableWecomCheckinSummaryNotify,
  );

  return {
    id: existing?.id ?? `outreach-${randomUUID()}`,
    ownerUserId: existing?.ownerUserId ?? ownerUserId,
    title: values.title.trim(),
    type: "outreach",
    startTime: toStoredDateTime(values.startTime),
    endTime: values.endTime ? toStoredDateTime(values.endTime) : undefined,
    registrationDeadline: values.registrationDeadline
      ? toStoredDateTime(values.registrationDeadline)
      : undefined,
    locationType: values.locationType,
    location: values.location.trim(),
    region: values.region.trim() || undefined,
    businessUnit: values.businessUnit.trim() || undefined,
    owner: values.owner.trim() || undefined,
    status: values.status,
    notes: values.notes.trim() || undefined,
    importKey: existing?.importKey,
    importedAt: existing?.importedAt,
    importBatchId: existing?.importBatchId,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    registrationEnabled: existing?.registrationEnabled ?? true,
    checkinEnabled: existing?.checkinEnabled ?? true,
    mealEnabled: existing?.mealEnabled ?? true,
    coverImageUrl: values.coverImageUrl.trim() || undefined,
    enableWecomNotify,
    wecomWebhook: enableWecomNotify ? values.wecomWebhook.trim() : "",
    wecomGroupName: values.wecomGroupName.trim() || undefined,
    enableWecomCheckinSummaryNotify,
    wecomCheckinSummaryIntervalMinutes:
      values.wecomCheckinSummaryIntervalMinutes ?? 15,
    registrationCount: existing?.registrationCount ?? 0,
    checkinCount: existing?.checkinCount ?? 0,
    walkInCount: existing?.walkInCount ?? 0,
  };
}

export async function createOutreachMeeting(values: MeetingFormValues, ownerUserId: string) {
  return mutateJsonCollection(outreachMeetingsCollection, (meetings) => {
    const meeting = formToOutreachMeeting(values, ownerUserId);
    return { records: [meeting, ...meetings], result: meeting };
  });
}

export async function updateOutreachMeeting(
  id: string,
  values: MeetingFormValues,
) {
  return mutateJsonCollection(outreachMeetingsCollection, (meetings) => {
    const existing = meetings.find((meeting) => meeting.id === id);

    if (!existing) {
      return { records: meetings, result: null };
    }

    const nextMeeting = formToOutreachMeeting(values, existing.ownerUserId, existing);
    return {
      records: meetings.map((meeting) =>
        meeting.id === id ? nextMeeting : meeting,
      ),
      result: nextMeeting,
    };
  });
}

export async function deleteOutreachMeeting(id: string) {
  return mutateJsonCollection(outreachMeetingsCollection, (meetings) => {
    const exists = meetings.some((meeting) => meeting.id === id);
    return {
      records: exists
        ? meetings.filter((meeting) => meeting.id !== id)
        : meetings,
      result: exists,
    };
  });
}

export async function appendImportedOutreachMeetings(
  importedMeetings: OutreachMeeting[],
) {
  return mutateJsonCollection(outreachMeetingsCollection, (meetings) => {
    const existingKeys = new Set(
      meetings.map((meeting) => `${meeting.ownerUserId}:${meeting.importKey}`).filter(Boolean),
    );
    const conflict = importedMeetings.find(
      (meeting) => meeting.importKey && existingKeys.has(`${meeting.ownerUserId}:${meeting.importKey}`),
    );

    if (conflict) {
      throw new Error(
        `历史导入编号 ${conflict.importKey} 已存在，请重新预览后再导入。`,
      );
    }

    return {
      records: [...importedMeetings, ...meetings],
      result: importedMeetings,
    };
  });
}
