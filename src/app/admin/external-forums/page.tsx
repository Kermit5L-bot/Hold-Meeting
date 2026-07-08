import { ExternalForumManager } from "@/components/admin/external-forum-manager";
import { readExternalForums } from "@/lib/external-forums-store";
import { readActiveSettingsOptions } from "@/lib/settings-options";

export default async function ExternalForumsPage() {
  const records = await readExternalForums();
  const [departmentOptions, costTypeOptions] = await Promise.all([
    readActiveSettingsOptions("department"),
    readActiveSettingsOptions("costType"),
  ]);

  return (
    <ExternalForumManager
      costTypeOptions={costTypeOptions}
      departmentOptions={departmentOptions}
      initialRecords={records}
    />
  );
}
