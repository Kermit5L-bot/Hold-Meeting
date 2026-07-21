import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type {
  ExternalForumRecord,
  MarketingMeetingRecord,
} from "../src/lib/types";

const databasePath = path.join(
  tmpdir(),
  `hold-meeting-csv-settings-${process.pid}.sqlite`,
);
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(`${databasePath}${suffix}`, { force: true });
}
process.env.REGISTRATIONS_DB_PATH = databasePath;

test("CSV 导入识别基础配置中的自定义业务字典", async () => {
  const { createSettingsOption } = await import("../src/lib/settings-store");
  const { buildImportTemplate, buildRecords } = await import(
    "../src/lib/csv-import"
  );

  const costType = await createSettingsOption({
    category: "costType",
    label: "测试差旅费",
  });
  const purpose = await createSettingsOption({
    category: "attendancePurpose",
    label: "测试市场调研",
  });
  const output = await createSettingsOption({
    category: "meetingOutput",
    label: "测试调研报告",
  });
  const meetingType = await createSettingsOption({
    category: "marketingMeetingType",
    label: "测试分享会",
  });

  const externalCsv = buildImportTemplate("external-forums")
    .replace("赞助费", costType.label)
    .replace("品牌曝光、行业交流", purpose.label)
    .replace("新闻稿、照片", output.label);
  const external = await buildRecords("external-forums", externalCsv);

  assert.equal(external.errorRows.length, 0);
  assert.equal(external.records.length, 1);
  const externalRecord = external.records[0] as ExternalForumRecord;
  assert.equal(externalRecord.costType, costType.value);
  assert.deepEqual(externalRecord.purposes, [purpose.value]);
  assert.deepEqual(externalRecord.outputs, [output.value]);

  const marketingCsv = buildImportTemplate("marketing-meetings").replace(
    '"复盘会"',
    `"${meetingType.label}"`,
  );
  const marketing = await buildRecords("marketing-meetings", marketingCsv);

  assert.equal(marketing.errorRows.length, 0);
  assert.equal(marketing.records.length, 1);
  const marketingRecord = marketing.records[0] as MarketingMeetingRecord;
  assert.equal(marketingRecord.meetingType, meetingType.value);
});
