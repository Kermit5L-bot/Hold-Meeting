import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type {
  ExternalForumRecord,
  MarketingMeetingRecord,
  OutreachMeeting,
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

test("外联会议导入支持报名截止时间并兼容旧模板", async () => {
  const { buildImportTemplate, buildRecords } = await import(
    "../src/lib/csv-import"
  );
  const template = buildImportTemplate("outreach-meetings");
  const current = await buildRecords("outreach-meetings", template);

  assert.match(template, /报名截止时间/);
  assert.equal(current.errorRows.length, 0);
  assert.equal(
    (current.records[0] as OutreachMeeting).registrationDeadline,
    "2025-05-17T18:00:00+08:00",
  );

  const legacyTemplate = template
    .replace(',"报名截止时间"', "")
    .replace(',"2025-05-17 18:00"', "");
  const legacy = await buildRecords("outreach-meetings", legacyTemplate);

  assert.equal(legacy.errorRows.length, 0);
  assert.equal(
    (legacy.records[0] as OutreachMeeting).registrationDeadline,
    undefined,
  );
});
