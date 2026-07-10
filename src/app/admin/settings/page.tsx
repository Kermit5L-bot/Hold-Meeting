import { SettingsManager } from "@/components/admin/settings-manager";
import { readSettingsOptions } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const options = await readSettingsOptions();

  return <SettingsManager initialOptions={options} />;
}
