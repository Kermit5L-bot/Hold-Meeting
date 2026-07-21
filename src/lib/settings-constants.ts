import type { SettingsCategory } from "@/lib/types";

export const settingsCategories: SettingsCategory[] = [
  "department",
  "region",
  "organizationType",
  "costType",
  "marketingMeetingType",
  "attendancePurpose",
  "meetingOutput",
];

export const categoryLabels: Record<SettingsCategory, string> = {
  department: "所属部门",
  region: "所属区域",
  organizationType: "单位类型",
  costType: "费用类型",
  marketingMeetingType: "营销中心会议类型",
  attendancePurpose: "参会目的",
  meetingOutput: "会议产出",
};

export const categoryDescriptions: Record<SettingsCategory, string> = {
  department: "维护会议所属部门，可新增、编辑、删除、启停和调整展示顺序。",
  region: "维护外联会议所属区域，可新增、编辑、删除、启停和调整展示顺序。",
  organizationType: "维护移动端报名使用的单位类型，可新增、编辑、删除、启停和调整展示顺序。",
  costType: "维护外部会议费用类型，可新增、编辑、删除、启停和调整展示顺序。",
  marketingMeetingType: "维护营销中心会议类型，可新增、编辑、删除、启停和调整展示顺序。",
  attendancePurpose: "维护外部会议参会目的，可新增、编辑、删除、启停和调整展示顺序。",
  meetingOutput: "维护外部会议产出类型，可新增、编辑、删除、启停和调整展示顺序。",
};
