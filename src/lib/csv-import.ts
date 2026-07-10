import { readExternalForums } from "@/lib/external-forums-store";
import { readMarketingMeetings } from "@/lib/marketing-meetings-store";
import { readOutreachMeetings } from "@/lib/outreach-meetings-store";
import { normalizePhone, readRegistrations } from "@/lib/registrations-store";
import type {
  AttendancePurpose,
  CheckinMethod,
  CheckinStatus,
  CostType,
  ExternalForumRecord,
  InternalMeetingType,
  LocationType,
  MarketingMeetingRecord,
  MealPreference,
  MeetingOutput,
  MeetingStatus,
  OrganizationType,
  OutreachMeeting,
  Registration,
  RegistrationSource,
  RegistrationStatus,
} from "@/lib/types";

export type ImportKind =
  | "outreach-meetings"
  | "outreach-registrations"
  | "external-forums"
  | "marketing-meetings";

export interface ImportIssue {
  rowNumber: number;
  importKey?: string;
  message: string;
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  errorRows: ImportIssue[];
  duplicateRows: ImportIssue[];
}

export interface ImportConfirmResult extends ImportPreview {
  importedRows: number;
}

type CsvRow = Record<string, string>;

const maxImportRows = 2000;

const templates: Record<ImportKind, string[]> = {
  "outreach-meetings": [
    "历史导入编号",
    "会议主题",
    "会议开始时间",
    "会议结束时间",
    "地点类型",
    "会议地点",
    "所属区域",
    "所属部门",
    "会议负责人",
    "会议状态",
    "备注",
  ],
  "outreach-registrations": [
    "报名历史导入编号",
    "会议历史导入编号",
    "姓名",
    "单位类型",
    "其他单位类型",
    "单位名称",
    "职位",
    "手机号",
    "是否用餐",
    "报名状态",
    "报名来源",
    "报名时间",
    "签到状态",
    "签到时间",
    "签到方式",
    "是否现场补报名",
    "备注",
  ],
  "external-forums": [
    "历史导入编号",
    "会议主题",
    "主办单位",
    "会议时间",
    "会议地点",
    "参会人",
    "是否演讲",
    "演讲题目",
    "演讲人",
    "费用",
    "费用类型",
    "所属部门",
    "是否赞助",
    "赞助形式",
    "参会目的",
    "会议产出",
    "后续跟进事项",
    "备注",
  ],
  "marketing-meetings": [
    "历史导入编号",
    "会议主题",
    "所属部门",
    "参会人",
    "会议时间",
    "地点类型",
    "线上会议链接",
    "线下会议地址",
    "会议类型",
    "会议结论",
    "后续事项",
    "备注",
  ],
};

const sampleRows: Record<ImportKind, string[]> = {
  "outreach-meetings": [
    "outreach-history-001",
    "华东区域客户交流会",
    "2025/05/18 09:30",
    "2025/05/18 16:30",
    "线下",
    "上海会议中心",
    "华东",
    "市场部",
    "张三",
    "已结束",
    "历史导入示例",
  ],
  "outreach-registrations": [
    "reg-history-001",
    "outreach-history-001",
    "李四",
    "企业",
    "",
    "示例科技有限公司",
    "市场经理",
    "13800008888",
    "是",
    "已报名",
    "会前报名",
    "2025/05/10 10:00",
    "已签到",
    "2025/05/18 09:40",
    "微信扫码",
    "否",
    "历史导入示例",
  ],
  "external-forums": [
    "forum-history-001",
    "中国环境监测产业论坛",
    "行业协会",
    "2025/04/12 09:00",
    "北京",
    "张三、李四",
    "是",
    "生态环境数字化实践",
    "张三",
    "36000",
    "赞助费",
    "市场部",
    "是",
    "论坛协办及展位",
    "品牌曝光、行业交流",
    "新闻稿、照片",
    "整理客户名单",
    "历史导入示例",
  ],
  "marketing-meetings": [
    "marketing-history-001",
    "营销中心月度复盘会",
    "营销中心",
    "市场部、品牌组",
    "2025/06/08 14:00",
    "线上",
    "企业微信会议",
    "",
    "复盘会",
    "统一活动数据口径",
    "下次会议前补充复盘表",
    "历史导入示例",
  ],
};

const meetingStatusMap: Record<string, MeetingStatus> = {
  草稿: "draft",
  已发布: "published",
  已结束: "ended",
  已归档: "archived",
  draft: "draft",
  published: "published",
  ended: "ended",
  archived: "archived",
};

const locationTypeMap: Record<string, LocationType> = {
  线上: "online",
  线下: "offline",
  online: "online",
  offline: "offline",
};

const yesNoMap: Record<string, boolean> = {
  是: true,
  否: false,
  yes: true,
  no: false,
  true: true,
  false: false,
};

const organizationTypeMap: Record<string, OrganizationType> = {
  政府: "government",
  高校: "college",
  协会: "association",
  第三方运维: "third_party_operation",
  第三方检测: "third_party_testing",
  仪器厂商: "vendor",
  企业: "company",
  其他: "other",
};

const mealMap: Record<string, MealPreference> = {
  是: "yes",
  否: "no",
  yes: "yes",
  no: "no",
};

const registrationStatusMap: Record<string, RegistrationStatus> = {
  已报名: "registered",
  已取消: "cancelled",
  registered: "registered",
  cancelled: "cancelled",
};

const registrationSourceMap: Record<string, RegistrationSource> = {
  会前报名: "pre_meeting",
  现场补报名: "walk_in",
  后台录入: "admin_entry",
  pre_meeting: "pre_meeting",
  walk_in: "walk_in",
  admin_entry: "admin_entry",
};

const checkinStatusMap: Record<string, CheckinStatus> = {
  未签到: "not_checked_in",
  已签到: "checked_in",
  not_checked_in: "not_checked_in",
  checked_in: "checked_in",
};

const checkinMethodMap: Record<string, CheckinMethod> = {
  微信扫码: "wechat_scan",
  后台手动签到: "admin_manual",
  wechat_scan: "wechat_scan",
  admin_manual: "admin_manual",
};

const costTypeMap: Record<string, CostType> = {
  报名费: "registration_fee",
  赞助费: "sponsorship_fee",
  展位费: "booth_fee",
  会务费: "conference_fee",
  其他: "other",
};

const purposeMap: Record<string, AttendancePurpose> = {
  品牌曝光: "brand_exposure",
  客户维护: "customer_maintenance",
  行业交流: "industry_exchange",
  商务拓展: "business_development",
  学习调研: "learning_research",
  其他: "other",
};

const outputMap: Record<string, MeetingOutput> = {
  新闻稿: "press_release",
  视频: "video",
  照片: "photo",
  会议纪要: "minutes",
  客户线索: "customer_leads",
  其他: "other",
};

const marketingTypeMap: Record<string, InternalMeetingType> = {
  例会: "regular",
  专题会: "special",
  培训会: "training",
  复盘会: "review",
  协调会: "coordination",
  其他: "other",
};

function escapeCsvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

export function buildImportTemplate(kind: ImportKind) {
  const rows = [templates[kind], sampleRows[kind]];
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")}`;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const normalizedText = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index];
    const next = normalizedText[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function csvToObjects(text: string): CsvRow[] {
  const rows = parseCsv(text);
  const headers = rows[0] ?? [];

  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), row[index]?.trim() ?? ""])),
  );
}

function required(row: CsvRow, key: string, errors: string[]) {
  const value = row[key]?.trim() ?? "";

  if (!value) {
    errors.push(`缺少${key}`);
  }

  return value;
}

function optional(row: CsvRow, key: string) {
  return row[key]?.trim() ?? "";
}

function parseMapped<T extends string>(
  value: string,
  map: Record<string, T>,
  label: string,
  errors: string[],
  fallback?: T,
) {
  if (!value && fallback) {
    return fallback;
  }

  const mapped = map[value];

  if (!mapped) {
    errors.push(`${label}无效：${value || "空"}`);
    return fallback ?? Object.values(map)[0];
  }

  return mapped;
}

function parseBool(value: string, label: string, errors: string[], fallback = false) {
  if (!value) {
    return fallback;
  }

  if (value in yesNoMap) {
    return yesNoMap[value];
  }

  errors.push(`${label}无效：${value}`);
  return fallback;
}

function parseOptionalMapped<T extends string>(
  value: string,
  map: Record<string, T>,
  label: string,
  errors: string[],
) {
  if (!value) {
    return undefined;
  }

  const mapped = map[value];

  if (!mapped) {
    errors.push(`${label}无效：${value}`);
  }

  return mapped;
}

function parseMappedList<T extends string>(
  value: string,
  map: Record<string, T>,
  label: string,
  errors: string[],
) {
  return splitList(value)
    .map((item) => {
      const mapped = map[item];

      if (!mapped) {
        errors.push(`${label}无效：${item}`);
      }

      return mapped;
    })
    .filter(Boolean);
}

function parseDateTime(value: string, label: string, errors: string[]) {
  if (!value) {
    errors.push(`缺少${label}`);
    return new Date().toISOString();
  }

  const normalized = value
    .replaceAll("/", "-")
    .replace(" ", "T")
    .replace(/T(\d{1,2}):(\d{2})$/, "T$1:$2:00+08:00")
    .replace(/T(\d{1,2}):(\d{2}):(\d{2})$/, "T$1:$2:$3+08:00");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    errors.push(`${label}格式无效：${value}`);
    return new Date().toISOString();
  }

  if (/([+-]\d{2}:\d{2}|Z)$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
    return `${normalized}T00:00:00+08:00`;
  }

  return normalized;
}

function splitList(value: string) {
  return value
    .split(/[、，,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getRows(text: string, errors: ImportIssue[]) {
  const rows = csvToObjects(text);

  if (rows.length > maxImportRows) {
    errors.push({
      rowNumber: 0,
      message: `单次最多导入 ${maxImportRows} 行`,
    });
    return [];
  }

  return rows;
}

function previewFromIssues(
  totalRows: number,
  errorRows: ImportIssue[],
  duplicateRows: ImportIssue[],
) {
  return {
    totalRows,
    validRows: Math.max(totalRows - errorRows.length - duplicateRows.length, 0),
    errorRows,
    duplicateRows,
  };
}

export async function previewImport(kind: ImportKind, text: string) {
  const built = await buildRecords(kind, text);
  return previewFromIssues(built.totalRows, built.errorRows, built.duplicateRows);
}

export async function buildRecords(kind: ImportKind, text: string) {
  if (kind === "outreach-meetings") {
    return buildOutreachMeetings(text);
  }

  if (kind === "outreach-registrations") {
    return buildOutreachRegistrations(text);
  }

  if (kind === "external-forums") {
    return buildExternalForums(text);
  }

  return buildMarketingMeetings(text);
}

async function buildOutreachMeetings(text: string) {
  const errorRows: ImportIssue[] = [];
  const duplicateRows: ImportIssue[] = [];
  const rows = getRows(text, errorRows);
  const existing = await readOutreachMeetings();
  const existingKeys = new Set(existing.map((item) => item.importKey).filter(Boolean));
  const seenKeys = new Set<string>();
  const batchId = id("import-batch");
  const timestamp = new Date().toISOString();
  const records: OutreachMeeting[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const errors: string[] = [];
    const importKey = required(row, "历史导入编号", errors);
    const title = required(row, "会议主题", errors);
    const startTime = parseDateTime(required(row, "会议开始时间", errors), "会议开始时间", errors);
    const endTimeValue = optional(row, "会议结束时间");
    const endTime = endTimeValue
      ? parseDateTime(endTimeValue, "会议结束时间", errors)
      : undefined;
    const locationType = parseMapped(required(row, "地点类型", errors), locationTypeMap, "地点类型", errors);
    const location = required(row, "会议地点", errors);
    const status = parseMapped(optional(row, "会议状态"), meetingStatusMap, "会议状态", errors, "ended");

    if (existingKeys.has(importKey) || seenKeys.has(importKey)) {
      duplicateRows.push({ rowNumber, importKey, message: "历史导入编号重复" });
      return;
    }

    if (errors.length) {
      errorRows.push({ rowNumber, importKey, message: errors.join("；") });
      return;
    }

    seenKeys.add(importKey);
    records.push({
      id: id("outreach-import"),
      title,
      type: "outreach",
      startTime,
      endTime,
      locationType,
      location,
      region: optional(row, "所属区域") || undefined,
      businessUnit: optional(row, "所属部门") || undefined,
      owner: optional(row, "会议负责人") || undefined,
      status,
      notes: optional(row, "备注") || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      importKey,
      importedAt: timestamp,
      importBatchId: batchId,
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
    });
  });

  return { totalRows: rows.length, errorRows, duplicateRows, records };
}

async function buildOutreachRegistrations(text: string) {
  const errorRows: ImportIssue[] = [];
  const duplicateRows: ImportIssue[] = [];
  const rows = getRows(text, errorRows);
  const meetings = await readOutreachMeetings();
  const meetingByImportKey = new Map(
    meetings
      .filter((meeting) => meeting.importKey)
      .map((meeting) => [meeting.importKey as string, meeting]),
  );
  const registrations = await readRegistrations();
  const existingKeys = new Set(
    registrations.map((item) => `${item.meetingId}:${normalizePhone(item.phone)}`),
  );
  const seenKeys = new Set<string>();
  const batchId = id("import-batch");
  const timestamp = new Date().toISOString();
  const records: Registration[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const errors: string[] = [];
    const meetingImportKey = required(row, "会议历史导入编号", errors);
    const meeting = meetingByImportKey.get(meetingImportKey);
    const name = required(row, "姓名", errors);
    const organizationType = parseMapped(required(row, "单位类型", errors), organizationTypeMap, "单位类型", errors, "other");
    const organizationName = required(row, "单位名称", errors);
    const phone = normalizePhone(required(row, "手机号", errors));
    const meal = parseMapped(optional(row, "是否用餐"), mealMap, "是否用餐", errors, "no");
    const status = parseMapped(optional(row, "报名状态"), registrationStatusMap, "报名状态", errors, "registered");
    const source = parseMapped(optional(row, "报名来源"), registrationSourceMap, "报名来源", errors, "admin_entry");
    const checkinStatus = parseMapped(optional(row, "签到状态"), checkinStatusMap, "签到状态", errors, "not_checked_in");
    const checkinMethodValue = optional(row, "签到方式");
    const checkinAtValue = optional(row, "签到时间");
    const registeredAtValue = optional(row, "报名时间");
    const isWalkIn = parseBool(optional(row, "是否现场补报名"), "是否现场补报名", errors, source === "walk_in");
    const importKey = optional(row, "报名历史导入编号") || `${meetingImportKey}-${phone}`;
    const registeredAt = registeredAtValue
      ? parseDateTime(registeredAtValue, "报名时间", errors)
      : timestamp;
    const checkinAt =
      checkinStatus === "checked_in"
        ? checkinAtValue
          ? parseDateTime(checkinAtValue, "签到时间", errors)
          : timestamp
        : undefined;
    const checkinMethod =
      checkinStatus === "checked_in" && checkinMethodValue
        ? parseMapped(checkinMethodValue, checkinMethodMap, "签到方式", errors, "wechat_scan")
        : checkinStatus === "checked_in"
          ? "wechat_scan"
          : undefined;

    if (!meeting) {
      errors.push("会议历史导入编号未匹配到外联会议");
    }

    if (phone.length !== 11) {
      errors.push("手机号需填写 11 位数字");
    }

    const duplicateKey = `${meeting?.id ?? meetingImportKey}:${phone}`;

    if (existingKeys.has(duplicateKey) || seenKeys.has(duplicateKey)) {
      duplicateRows.push({ rowNumber, importKey, message: "同一会议下手机号重复" });
      return;
    }

    if (errors.length) {
      errorRows.push({ rowNumber, importKey, message: errors.join("；") });
      return;
    }

    seenKeys.add(duplicateKey);
    records.push({
      id: id("reg-import"),
      meetingId: meeting?.id ?? "",
      status,
      source,
      registeredAt,
      createdAt: timestamp,
      updatedAt: timestamp,
      checkinStatus,
      checkinAt,
      checkinMethod,
      isWalkIn,
      name,
      organizationType,
      otherOrganizationType:
        organizationType === "other" ? optional(row, "其他单位类型") || "其他" : undefined,
      organizationName,
      position: optional(row, "职位") || undefined,
      phone,
      meal,
      notes: optional(row, "备注") || undefined,
      importKey,
      importedAt: timestamp,
      importBatchId: batchId,
      wecomNotifyStatus: "not_sent",
    });
  });

  return { totalRows: rows.length, errorRows, duplicateRows, records };
}

async function buildExternalForums(text: string) {
  const errorRows: ImportIssue[] = [];
  const duplicateRows: ImportIssue[] = [];
  const rows = getRows(text, errorRows);
  const existing = await readExternalForums();
  const existingKeys = new Set(existing.map((item) => item.importKey).filter(Boolean));
  const seenKeys = new Set<string>();
  const batchId = id("import-batch");
  const timestamp = new Date().toISOString();
  const records: ExternalForumRecord[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const errors: string[] = [];
    const importKey = required(row, "历史导入编号", errors);
    const title = required(row, "会议主题", errors);
    const organizer = required(row, "主办单位", errors);
    const meetingTime = parseDateTime(required(row, "会议时间", errors), "会议时间", errors);
    const location = required(row, "会议地点", errors);
    const attendees = splitList(required(row, "参会人", errors));
    const businessUnit = required(row, "所属部门", errors);
    const hasSpeech = parseBool(required(row, "是否演讲", errors), "是否演讲", errors);
    const sponsored = parseBool(optional(row, "是否赞助"), "是否赞助", errors);
    const costValue = optional(row, "费用");
    const cost = costValue ? Number(costValue) : undefined;
    const costType = parseOptionalMapped(
      optional(row, "费用类型"),
      costTypeMap,
      "费用类型",
      errors,
    );
    const purposes = parseMappedList(
      optional(row, "参会目的"),
      purposeMap,
      "参会目的",
      errors,
    );
    const outputs = parseMappedList(
      optional(row, "会议产出"),
      outputMap,
      "会议产出",
      errors,
    );

    if (costValue && Number.isNaN(cost)) {
      errors.push("费用必须为数字");
    }

    if (hasSpeech && !optional(row, "演讲题目")) {
      errors.push("是否演讲为是时需填写演讲题目");
    }

    if (hasSpeech && !optional(row, "演讲人")) {
      errors.push("是否演讲为是时需填写演讲人");
    }

    if (sponsored && !optional(row, "赞助形式")) {
      errors.push("是否赞助为是时需填写赞助形式");
    }

    if (existingKeys.has(importKey) || seenKeys.has(importKey)) {
      duplicateRows.push({ rowNumber, importKey, message: "历史导入编号重复" });
      return;
    }

    if (errors.length) {
      errorRows.push({ rowNumber, importKey, message: errors.join("；") });
      return;
    }

    seenKeys.add(importKey);
    records.push({
      id: id("forum-import"),
      title,
      organizer,
      meetingTime,
      location,
      attendees,
      hasSpeech,
      speechTopic: hasSpeech ? optional(row, "演讲题目") : undefined,
      speaker: hasSpeech ? optional(row, "演讲人") : undefined,
      cost,
      costType,
      businessUnit,
      sponsored,
      sponsorshipType: sponsored ? optional(row, "赞助形式") : undefined,
      purposes,
      outputs,
      followUp: optional(row, "后续跟进事项") || undefined,
      notes: optional(row, "备注") || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      importKey,
      importedAt: timestamp,
      importBatchId: batchId,
    });
  });

  return { totalRows: rows.length, errorRows, duplicateRows, records };
}

async function buildMarketingMeetings(text: string) {
  const errorRows: ImportIssue[] = [];
  const duplicateRows: ImportIssue[] = [];
  const rows = getRows(text, errorRows);
  const existing = await readMarketingMeetings();
  const existingKeys = new Set(existing.map((item) => item.importKey).filter(Boolean));
  const seenKeys = new Set<string>();
  const batchId = id("import-batch");
  const timestamp = new Date().toISOString();
  const records: MarketingMeetingRecord[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const errors: string[] = [];
    const importKey = required(row, "历史导入编号", errors);
    const title = required(row, "会议主题", errors);
    const businessUnit = required(row, "所属部门", errors);
    const attendees = splitList(required(row, "参会人", errors));
    const meetingTime = parseDateTime(required(row, "会议时间", errors), "会议时间", errors);
    const locationType = parseMapped(required(row, "地点类型", errors), locationTypeMap, "地点类型", errors);
    const onlineUrl = optional(row, "线上会议链接");
    const offlineAddress = optional(row, "线下会议地址");
    const meetingType = parseOptionalMapped(
      optional(row, "会议类型"),
      marketingTypeMap,
      "会议类型",
      errors,
    );

    if (locationType === "online" && !onlineUrl) {
      errors.push("地点类型为线上时需填写线上会议链接");
    }

    if (locationType === "offline" && !offlineAddress) {
      errors.push("地点类型为线下时需填写线下会议地址");
    }

    if (existingKeys.has(importKey) || seenKeys.has(importKey)) {
      duplicateRows.push({ rowNumber, importKey, message: "历史导入编号重复" });
      return;
    }

    if (errors.length) {
      errorRows.push({ rowNumber, importKey, message: errors.join("；") });
      return;
    }

    seenKeys.add(importKey);
    records.push({
      id: id("marketing-import"),
      title,
      businessUnit,
      attendees,
      meetingTime,
      locationType,
      onlineUrl: locationType === "online" ? onlineUrl : undefined,
      offlineAddress: locationType === "offline" ? offlineAddress : undefined,
      meetingType,
      conclusion: optional(row, "会议结论") || undefined,
      followUp: optional(row, "后续事项") || undefined,
      notes: optional(row, "备注") || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      importKey,
      importedAt: timestamp,
      importBatchId: batchId,
    });
  });

  return { totalRows: rows.length, errorRows, duplicateRows, records };
}
