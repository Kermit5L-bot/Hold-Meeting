import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  mutateJsonCollection,
  readJsonCollection,
  type JsonCollectionConfig,
} from "@/lib/sqlite-json-collection";
import { settingsCategories } from "@/lib/settings-constants";
import type { SettingsCategory, SettingsOption } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const settingsPath = path.join(dataDir, "settings.json");

const seedDefinitions: Array<{
  category: SettingsCategory;
  value: string;
  label: string;
}> = [
  { category: "department", value: "环境事业部", label: "环境事业部" },
  { category: "department", value: "检测业务线", label: "检测业务线" },
  { category: "department", value: "教育行业线", label: "教育行业线" },
  { category: "department", value: "营销中心", label: "营销中心" },
  { category: "region", value: "华东", label: "华东" },
  { category: "region", value: "华南", label: "华南" },
  { category: "region", value: "华北", label: "华北" },
  { category: "region", value: "西南", label: "西南" },
  { category: "organizationType", value: "government", label: "政府" },
  { category: "organizationType", value: "college", label: "高校" },
  { category: "organizationType", value: "association", label: "协会" },
  { category: "organizationType", value: "third_party_operation", label: "第三方运维" },
  { category: "organizationType", value: "third_party_testing", label: "第三方检测" },
  { category: "organizationType", value: "vendor", label: "仪器厂商" },
  { category: "organizationType", value: "company", label: "企业" },
  { category: "organizationType", value: "other", label: "其他" },
  { category: "costType", value: "registration_fee", label: "报名费" },
  { category: "costType", value: "sponsorship_fee", label: "赞助费" },
  { category: "costType", value: "booth_fee", label: "展位费" },
  { category: "costType", value: "conference_fee", label: "会务费" },
  { category: "costType", value: "other", label: "其他" },
  { category: "marketingMeetingType", value: "regular", label: "例会" },
  { category: "marketingMeetingType", value: "special", label: "专题会" },
  { category: "marketingMeetingType", value: "training", label: "培训会" },
  { category: "marketingMeetingType", value: "review", label: "复盘会" },
  { category: "marketingMeetingType", value: "coordination", label: "协调会" },
  { category: "marketingMeetingType", value: "other", label: "其他" },
  { category: "attendancePurpose", value: "brand_exposure", label: "品牌曝光" },
  { category: "attendancePurpose", value: "customer_maintenance", label: "客户维护" },
  { category: "attendancePurpose", value: "industry_exchange", label: "行业交流" },
  { category: "attendancePurpose", value: "business_development", label: "商务拓展" },
  { category: "attendancePurpose", value: "learning_research", label: "学习调研" },
  { category: "attendancePurpose", value: "other", label: "其他" },
  { category: "meetingOutput", value: "press_release", label: "新闻稿" },
  { category: "meetingOutput", value: "video", label: "视频" },
  { category: "meetingOutput", value: "photo", label: "照片" },
  { category: "meetingOutput", value: "minutes", label: "会议纪要" },
  { category: "meetingOutput", value: "customer_leads", label: "客户线索" },
  { category: "meetingOutput", value: "other", label: "其他" },
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
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}

const settingsCollection: JsonCollectionConfig<SettingsOption> = {
  name: "settings",
  legacyPath: settingsPath,
  seedRecords: seedSettings(),
  normalize: (record) => ({
    id: record.id,
    category: record.category,
    value: record.value,
    label: record.label,
    enabled: record.enabled,
    sortOrder: record.sortOrder,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }),
};

function mergeAndSortSettings(options: SettingsOption[]) {
  return [...options].sort((a, b) =>
    a.category === b.category
      ? a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "zh-Hans-CN")
      : a.category.localeCompare(b.category),
  );
}

export async function readSettingsOptions() {
  return mergeAndSortSettings(readJsonCollection(settingsCollection));
}

export async function readSettingsByCategory(category: SettingsCategory) {
  const options = await readSettingsOptions();
  return options.filter((option) => option.category === category);
}

export async function createSettingsOption(values: {
  category: SettingsCategory;
  label: string;
}) {
  if (!settingsCategories.includes(values.category)) {
    throw new Error("配置类型无效。");
  }

  const label = values.label.trim();

  if (!label) {
    throw new Error("请填写配置名称。");
  }

  return mutateJsonCollection(settingsCollection, (storedOptions) => {
    const options = mergeAndSortSettings(storedOptions);
    const duplicated = options.some(
      (option) =>
        option.category === values.category &&
        option.label.trim().toLowerCase() === label.toLowerCase(),
    );

    if (duplicated) {
      throw new Error("配置名称已存在。");
    }

    const categoryOptions = options.filter(
      (option) => option.category === values.category,
    );
    const timestamp = now();
    const option: SettingsOption = {
      id: `${values.category}-${randomUUID()}`,
      category: values.category,
      value: `custom-${randomUUID()}`,
      label,
      enabled: true,
      sortOrder:
        categoryOptions.length > 0
          ? Math.max(...categoryOptions.map((item) => item.sortOrder)) + 10
          : 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return { records: [...options, option], result: option };
  });
}

export async function updateSettingsOption(
  id: string,
  values: {
    label?: string;
    enabled?: boolean;
    sortOrder?: number;
  },
) {
  return mutateJsonCollection(settingsCollection, (storedOptions) => {
    const options = mergeAndSortSettings(storedOptions);
    const existing = options.find((option) => option.id === id);

    if (!existing) {
      return { records: options, result: null };
    }

    const label = values.label?.trim() || existing.label;
    const duplicated = options.some(
      (option) =>
        option.id !== id &&
        option.category === existing.category &&
        option.label.trim().toLowerCase() === label.toLowerCase(),
    );

    if (duplicated) {
      throw new Error("配置名称已存在。");
    }

    const nextOption: SettingsOption = {
      ...existing,
      label,
      enabled: values.enabled ?? existing.enabled,
      sortOrder:
        typeof values.sortOrder === "number" && Number.isFinite(values.sortOrder)
          ? values.sortOrder
          : existing.sortOrder,
      updatedAt: now(),
    };

    return {
      records: options.map((option) => (option.id === id ? nextOption : option)),
      result: nextOption,
    };
  });
}

export async function reorderSettingsOptions(
  category: SettingsCategory,
  orderedIds: string[],
) {
  if (!settingsCategories.includes(category)) {
    throw new Error("配置类型无效。");
  }

  return mutateJsonCollection(settingsCollection, (storedOptions) => {
    const options = mergeAndSortSettings(storedOptions);
    const categoryOptions = options.filter(
      (option) => option.category === category,
    );
    const categoryIds = new Set(categoryOptions.map((option) => option.id));
    const submittedIds = new Set(orderedIds);

    if (
      orderedIds.length !== categoryOptions.length ||
      submittedIds.size !== orderedIds.length ||
      orderedIds.some((id) => !categoryIds.has(id))
    ) {
      throw new Error("排序数据与当前配置项不一致，请刷新页面后重试。");
    }

    const orderById = new Map(
      orderedIds.map((id, index) => [id, index * 10]),
    );
    const timestamp = now();
    const nextOptions = options.map((option) => {
      const sortOrder = orderById.get(option.id);

      return sortOrder === undefined
        ? option
        : { ...option, sortOrder, updatedAt: timestamp };
    });

    return {
      records: nextOptions,
      result: mergeAndSortSettings(nextOptions).filter(
        (option) => option.category === category,
      ),
    };
  });
}

export async function deleteSettingsOption(id: string) {
  return mutateJsonCollection(settingsCollection, (storedOptions) => {
    const options = mergeAndSortSettings(storedOptions);
    const existing = options.find((option) => option.id === id);

    if (!existing) {
      return { records: options, result: false };
    }

    return {
      records: options.filter((option) => option.id !== id),
      result: true,
    };
  });
}
