import type {
  CheckinMethod,
  CheckinStatus,
  MealPreference,
  OrganizationType,
  RegistrationSource,
  RegistrationStatus,
} from "@/lib/types";

export const organizationTypeOptions: Array<{
  value: OrganizationType;
  label: string;
}> = [
  { value: "government", label: "政府" },
  { value: "college", label: "高校" },
  { value: "association", label: "协会" },
  { value: "third_party_operation", label: "第三方运维" },
  { value: "third_party_testing", label: "第三方检测" },
  { value: "vendor", label: "仪器厂商" },
  { value: "company", label: "企业" },
  { value: "other", label: "其他" },
];

export const mealPreferenceLabels: Record<MealPreference, string> = {
  yes: "是",
  no: "否",
};

export const registrationStatusLabels: Record<RegistrationStatus, string> = {
  registered: "已报名",
  cancelled: "已取消",
};

export const registrationSourceLabels: Record<RegistrationSource, string> = {
  pre_meeting: "会前报名",
  walk_in: "现场补报名",
  admin_entry: "后台录入",
};

export const checkinStatusLabels: Record<CheckinStatus, string> = {
  not_checked_in: "未签到",
  checked_in: "已签到",
};

export const checkinMethodLabels: Record<CheckinMethod, string> = {
  wechat_scan: "微信扫码",
  admin_manual: "后台手动签到",
};

export const organizationTypeLabels = Object.fromEntries(
  organizationTypeOptions.map((item) => [item.value, item.label]),
) as Record<OrganizationType, string>;
