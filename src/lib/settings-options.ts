import { readSettingsByCategory } from "@/lib/settings-store";
import type { SettingsCategory } from "@/lib/types";

export interface SelectOption {
  value: string;
  label: string;
}

export async function readActiveSettingsOptions(category: SettingsCategory) {
  const options = await readSettingsByCategory(category);

  return options
    .filter((option) => option.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((option) => ({
      value: option.value,
      label: option.label,
    }));
}

export async function readSettingsLabelMap(category: SettingsCategory) {
  const options = await readSettingsByCategory(category);

  return Object.fromEntries(
    options.map((option) => [option.value, option.label]),
  ) as Record<string, string>;
}
