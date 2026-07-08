import type { InternalMeetingType } from "@/lib/types";

export const internalMeetingTypeOptions: Array<{
  value: InternalMeetingType;
  label: string;
}> = [
  { value: "regular", label: "例会" },
  { value: "special", label: "专题会" },
  { value: "training", label: "培训会" },
  { value: "review", label: "复盘会" },
  { value: "coordination", label: "协调会" },
  { value: "other", label: "其他" },
];

export const internalMeetingTypeLabels = Object.fromEntries(
  internalMeetingTypeOptions.map((item) => [item.value, item.label]),
) as Record<InternalMeetingType, string>;
