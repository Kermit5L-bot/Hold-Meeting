import type {
  AttendancePurpose,
  CostType,
  MeetingOutput,
} from "@/lib/types";

export const costTypeOptions: Array<{ value: CostType; label: string }> = [
  { value: "registration_fee", label: "报名费" },
  { value: "sponsorship_fee", label: "赞助费" },
  { value: "booth_fee", label: "展位费" },
  { value: "conference_fee", label: "会务费" },
  { value: "other", label: "其他" },
];

export const attendancePurposeOptions: Array<{
  value: AttendancePurpose;
  label: string;
}> = [
  { value: "brand_exposure", label: "品牌曝光" },
  { value: "customer_maintenance", label: "客户维护" },
  { value: "industry_exchange", label: "行业交流" },
  { value: "business_development", label: "商务拓展" },
  { value: "learning_research", label: "学习调研" },
  { value: "other", label: "其他" },
];

export const meetingOutputOptions: Array<{
  value: MeetingOutput;
  label: string;
}> = [
  { value: "press_release", label: "新闻稿" },
  { value: "video", label: "视频" },
  { value: "photo", label: "照片" },
  { value: "minutes", label: "会议纪要" },
  { value: "customer_leads", label: "客户线索" },
  { value: "other", label: "其他" },
];

export const costTypeLabels = Object.fromEntries(
  costTypeOptions.map((item) => [item.value, item.label]),
) as Record<CostType, string>;

export const attendancePurposeLabels = Object.fromEntries(
  attendancePurposeOptions.map((item) => [item.value, item.label]),
) as Record<AttendancePurpose, string>;

export const meetingOutputLabels = Object.fromEntries(
  meetingOutputOptions.map((item) => [item.value, item.label]),
) as Record<MeetingOutput, string>;
