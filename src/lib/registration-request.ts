import {
  isValidPhoneLength,
  normalizePhoneDigits,
  phoneLengthMessage,
} from "@/lib/phone";
import type {
  OrganizationType,
  RegistrationFormValues,
} from "@/lib/types";

const organizationTypes = new Set<OrganizationType>([
  "government",
  "college",
  "association",
  "third_party_operation",
  "third_party_testing",
  "vendor",
  "company",
  "other",
]);

function stringValue(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "string" ? record[key].trim() : "";
}

function exceeds(value: string, maxLength: number) {
  return value.length > maxLength;
}

export function parseRegistrationFormValues(
  input: unknown,
  allowedOrganizationTypes: ReadonlySet<string> = organizationTypes,
): { values: RegistrationFormValues; error: null } | { values: null; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { values: null, error: "提交数据格式无效，请刷新页面后重试。" };
  }

  const record = input as Record<string, unknown>;
  const meetingId = stringValue(record, "meetingId");
  const name = stringValue(record, "name");
  const organizationTypeValue = stringValue(record, "organizationType");
  const otherOrganizationType = stringValue(record, "otherOrganizationType");
  const organizationName = stringValue(record, "organizationName");
  const position = stringValue(record, "position");
  const phone = normalizePhoneDigits(stringValue(record, "phone"));
  const mealValue = stringValue(record, "meal");
  const notes = stringValue(record, "notes");

  if (!meetingId) {
    return { values: null, error: "缺少会议信息，请重新打开页面。" };
  }

  if (exceeds(meetingId, 120)) {
    return { values: null, error: "会议编号格式无效。" };
  }

  if (!name) {
    return { values: null, error: "请填写姓名。" };
  }

  if (exceeds(name, 50)) {
    return { values: null, error: "姓名不能超过 50 个字符。" };
  }

  if (!allowedOrganizationTypes.has(organizationTypeValue)) {
    return { values: null, error: "请选择有效的单位类型。" };
  }

  const organizationType = organizationTypeValue as OrganizationType;
  if (organizationType === "other" && !otherOrganizationType) {
    return { values: null, error: "请选择或填写其他单位类型。" };
  }

  if (exceeds(otherOrganizationType, 50)) {
    return { values: null, error: "其他单位类型不能超过 50 个字符。" };
  }

  if (!organizationName) {
    return { values: null, error: "请填写单位名称。" };
  }

  if (exceeds(organizationName, 200)) {
    return { values: null, error: "单位名称不能超过 200 个字符。" };
  }

  if (exceeds(position, 100)) {
    return { values: null, error: "职位不能超过 100 个字符。" };
  }

  if (!isValidPhoneLength(phone)) {
    return { values: null, error: phoneLengthMessage() };
  }

  if (mealValue !== "yes" && mealValue !== "no") {
    return { values: null, error: "请选择是否用餐。" };
  }

  if (exceeds(notes, 1000)) {
    return { values: null, error: "备注不能超过 1000 个字符。" };
  }

  return {
    values: {
      meetingId,
      name,
      organizationType,
      otherOrganizationType:
        organizationType === "other" ? otherOrganizationType : "",
      organizationName,
      position,
      phone,
      meal: mealValue,
      notes,
    },
    error: null,
  };
}
