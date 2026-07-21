import { SettingsDirectoryManager } from "@/components/admin/settings-directory-manager";
import { settingsCategories } from "@/lib/settings-constants";
import { readSettingsOptions } from "@/lib/settings-store";
import type { SettingsCategory } from "@/lib/types";
import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await getCurrentAdminUser();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") redirect("/admin/forbidden");
  const { category } = await searchParams;
  const activeCategory = settingsCategories.includes(category as SettingsCategory)
    ? (category as SettingsCategory)
    : settingsCategories[0];
  const options = await readSettingsOptions();

  return (
    <SettingsDirectoryManager
      activeCategory={activeCategory}
      initialOptions={options}
      key={activeCategory}
    />
  );
}
