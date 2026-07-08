import type { LocationType, MeetingStatus, MeetingType } from "@/lib/types";

export const meetingTypeOptions: Array<{
  value: MeetingType;
  label: string;
}> = [
  { value: "outreach", label: "外联会议" },
  { value: "external_forum", label: "外部会议&论坛" },
  { value: "marketing_center", label: "营销中心会议" },
];

export const meetingStatusOptions: Array<{
  value: MeetingStatus;
  label: string;
}> = [
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "ended", label: "已结束" },
  { value: "archived", label: "已归档" },
];

export const locationTypeOptions: Array<{
  value: LocationType;
  label: string;
}> = [
  { value: "online", label: "线上" },
  { value: "offline", label: "线下" },
];

export const meetingTypeLabels = Object.fromEntries(
  meetingTypeOptions.map((item) => [item.value, item.label]),
) as Record<MeetingType, string>;

export const meetingStatusLabels = Object.fromEntries(
  meetingStatusOptions.map((item) => [item.value, item.label]),
) as Record<MeetingStatus, string>;

export const locationTypeLabels = Object.fromEntries(
  locationTypeOptions.map((item) => [item.value, item.label]),
) as Record<LocationType, string>;
