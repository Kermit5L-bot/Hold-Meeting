import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SettingsCategory, SettingsOption } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const settingsPath = path.join(dataDir, "settings.json");

const editableCustomCategories: SettingsCategory[] = ["department", "region"];

const seedDefinitions: Array<{
  category: SettingsCategory;
  value: string;
  label: string;
  system?: boolean;
}> = [
  { category: "department", value: "环境事业部", label: "环境事业部" },
  { category: "department", value: "检测业务线", label: "检测业务线" },
  { category: "department", value: "教育行业线", label: "教育行业线" },
  { category: "department", value: "营销中心", label: "营销中心" },
  { category: "region", value: "华东", label: "华东" },
  { category: "region", value: "华南", label: "华南" },
  { category: "region", value: "华北", label: "华北" },
  { category: "region", value: "西南", label: "西南" },
  { category: "organizationType", value: "government", label: "政府", system: true },
  { category: "organizationType", value: "college", label: "高校", system: true },
  { category: "organizationType", value: "association", label: "协会", system: true },
  { category: "organizationType", value: "third_party_operation", label: "第三方运维", system: true },
  { category: "organizationType", value: "third_party_testing", label: "第三方检测", system: true },
  { category: "organizationType", value: "vendor", label: "仪器厂商", system: true },
  { category: "organizationType", value: "company", label: "企业", system: true },
  { category: "organizationType", value: "other", label: "其他", system: true },
  { category: "costType", value: "registration_fee", label: "报名费", system: true },
  { category: "costType", value: "sponsorship_fee", label: "赞助费", system: true },
  { category: "costType", value: "booth_fee", label: "展位费", system: true },
  { category: "costType", value: "conference_fee", label: "会务费", system: true },
  { category: "costType", value: "other", label: "其他", system: true },
  { category: "marketingMeetingType", value: "regular", label: "例会", system: true },
  { category: "marketingMeetingType", value: "special", label: "专题会", system: true },
  { category: "marketingMeetingType", value: "training", label: "培训会", system: true },
  { category: "marketingMeetingType", value: "review", label: "复盘会", system: true },
  { category: "marketingMeetingType", value: "coordination", label: "协调会", system: true },
  { category: "marketingMeetingType", value: "other", label: "其他", system: true },
  { category: "attendancePurpose", value: "brand_exposure", label: "品牌曝光", system: true },
  { category: "attendancePurpose", value: "customer_maintenance", label: "客户维护", system: true },
  { category: "attendancePurpose", value: "industry_exchange", label: "行业交流", system: true },
  { category: "attendancePurpose", value: "business_development", label: "商务拓展", system: true },
  { category: "attendancePurpose", value: "learning_research", label: "学习调研", system: true },
  { category: "attendancePurpose", value: "other", label: "其他", system: true },
  { category: "meetingOutput", value: "press_release", label: "新闻稿", system: true },
  { category: "meetingOutput", value: "video", label: "视频", system: true },
  { category: "meetingOutput", value: "photo", label: "照片", system: true },
  { category: "meetingOutput", value: "minutes", label: "会议纪要", system: true },
  { category: "meetingOutput", value: "customer_leads", label: "客户线索", system: true },
  { category: "meetingOutput", value: "other", label: "其他", system: true },
];

function now() {
  return new Date().toISOString();
}

function makeId(category: SettingsCategory, value: string) {
  return `${category}-${value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "-")}`;
}

function seedSettings() {
  const timestamp = now();
  const counters = new Map<SettingsCategory, number>();

  return seedDefinitions.map((item) => {
    const sortOrder = counters.get(item.category) ?? 0;
    counters.set(item.category, sortOrder + 10);

    return {
      id: makeId(item.category, item.value),
      category: item.category,
      value: item.value,
      label: item.label,
      enabled: true,
      sortOrder,
      system: item.system ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}

async function ensureSettingsFile() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(settingsPath, "utf8");
  } catch {
    await writeFile(settingsPath, `${JSON.stringify(seedSettings(), null, 2)}\n`, "utf8");
  }
}

async function writeSettings(options: SettingsOption[]) {
  await ensureSettingsFile();
  await writeFile(settingsPath, `${JSON.stringify(options, null, 2)}\n`, "utf8");
}

export async function readSettingsOptions() {
  await ensureSettingsFile();
  const raw = await readFile(settingsPath, "utf8");

  try {
    const parsed = JSON.parse(raw) as SettingsOption[];
    const seedById = new Map(seedSettings().map((item) => [item.id, item]));
    const parsedById = new Map(
      Array.isArray(parsed) ? parsed.map((item) => [item.id, item]) : [],
    );
    const merged = [
      ...Array.from(parsedById.values()),
      ...Array.from(seedById.values()).filter((item) => !parsedById.has(item.id)),
    ];

    return merged.sort((a, b) =>
      a.category === b.category
        ? a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "zh-Hans-CN")
        : a.category.localeCompare(b.category),
    );
  } catch {
    return seedSettings();
  }
}

export async function readSettingsByCategory(category: SettingsCategory) {
  const options = await readSettingsOptions();
  return options.filter((option) => option.category === category);
}

export async function createSettingsOption(values: {
  category: SettingsCategory;
  label: string;
}) {
  if (!editableCustomCategories.includes(values.category)) {
    throw new Error("该配置项不支持新增自定义值。");
  }

  const options = await readSettingsOptions();
  const label = values.label.trim();

  if (!label) {
    throw new Error("请填写配置名称。");
  }

  const duplicated = options.some(
    (option) =>
      option.category === values.category &&
      option.label.trim().toLowerCase() === label.toLowerCase(),
  );

  if (duplicated) {
    throw new Error("配置名称已存在。");
  }

  const categoryOptions = options.filter((option) => option.category === values.category);
  const timestamp = now();
  const option: SettingsOption = {
    id: `${values.category}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    category: values.category,
    value: label,
    label,
    enabled: true,
    sortOrder:
      categoryOptions.length > 0
        ? Math.max(...categoryOptions.map((item) => item.sortOrder)) + 10
        : 0,
    system: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await writeSettings([...options, option]);
  return option;
}

export async function updateSettingsOption(
  id: string,
  values: {
    label?: string;
    enabled?: boolean;
    sortOrder?: number;
  },
) {
  const options = await readSettingsOptions();
  const existing = options.find((option) => option.id === id);

  if (!existing) {
    return null;
  }

  const label = values.label?.trim() || existing.label;
  const nextOption: SettingsOption = {
    ...existing,
    label,
    value: existing.system ? existing.value : label,
    enabled: values.enabled ?? existing.enabled,
    sortOrder:
      typeof values.sortOrder === "number" && Number.isFinite(values.sortOrder)
        ? values.sortOrder
        : existing.sortOrder,
    updatedAt: now(),
  };

  await writeSettings(options.map((option) => (option.id === id ? nextOption : option)));
  return nextOption;
}

export async function deleteSettingsOption(id: string) {
  const options = await readSettingsOptions();
  const existing = options.find((option) => option.id === id);

  if (!existing) {
    return false;
  }

  if (existing.system) {
    throw new Error("系统内置配置不支持删除，可停用。");
  }

  await writeSettings(options.filter((option) => option.id !== id));
  return true;
}
