import assert from "node:assert/strict";
import test from "node:test";
import {
  parseExternalForumFormValues,
  parseMarketingMeetingFormValues,
  parseMeetingFormValues,
} from "../src/lib/admin-form-request";
import { parseRegistrationFormValues } from "../src/lib/registration-request";
import { buildCsv } from "../src/lib/spreadsheet-export";

const validMeeting = {
  title: "客户交流会",
  startTime: "2026-07-21T09:00",
  endTime: "2026-07-21T12:00",
  registrationDeadline: "",
  locationType: "offline",
  location: "上海会议中心",
  region: "华东",
  businessUnit: "市场部",
  owner: "负责人",
  status: "published",
  notes: "",
  coverImageUrl: "",
  enableWecomNotify: false,
  wecomWebhook: "",
  wecomGroupName: "",
  enableWecomCheckinSummaryNotify: false,
  wecomCheckinSummaryIntervalMinutes: 15,
};

test("会议表单拒绝外部头图地址和路径穿越", () => {
  const external = parseMeetingFormValues({
    ...validMeeting,
    coverImageUrl: "https://example.com/tracker.jpg",
  });
  const traversal = parseMeetingFormValues({
    ...validMeeting,
    coverImageUrl: "/uploads/outreach-covers/../secret.jpg",
  });

  assert.equal(external.values, null);
  assert.equal(traversal.values, null);
});

test("会议表单接受应用内上传的安全图片地址", () => {
  const parsed = parseMeetingFormValues({
    ...validMeeting,
    coverImageUrl: "/uploads/outreach-covers/cover-123.webp",
  });

  assert.equal(parsed.error, null);
  assert.equal(
    parsed.values?.coverImageUrl,
    "/uploads/outreach-covers/cover-123.webp",
  );
});

test("会议表单校验并保留可选报名截止时间", () => {
  const valid = parseMeetingFormValues({
    ...validMeeting,
    registrationDeadline: "2026-07-20T18:00",
  });
  const invalid = parseMeetingFormValues({
    ...validMeeting,
    registrationDeadline: "2026-02-30T18:00",
  });

  assert.equal(valid.values?.registrationDeadline, "2026-07-20T18:00");
  assert.equal(invalid.values, null);
});

test("报名表单规范化手机号并清理字段空白", () => {
  const parsed = parseRegistrationFormValues({
    meetingId: " outreach-1 ",
    name: " 张三 ",
    organizationType: "company",
    otherOrganizationType: "",
    organizationName: " 万维公司 ",
    position: " 经理 ",
    phone: "138-0013-8000",
    meal: "yes",
    notes: " 无 ",
  });

  assert.equal(parsed.error, null);
  assert.equal(parsed.values?.meetingId, "outreach-1");
  assert.equal(parsed.values?.name, "张三");
  assert.equal(parsed.values?.phone, "13800138000");
});

test("报名表单拒绝非法单位类型和短手机号", () => {
  const invalidOrganization = parseRegistrationFormValues({
    meetingId: "outreach-1",
    name: "张三",
    organizationType: "unknown",
    organizationName: "万维公司",
    phone: "13800138000",
    meal: "no",
  });
  const invalidPhone = parseRegistrationFormValues({
    meetingId: "outreach-1",
    name: "张三",
    organizationType: "company",
    organizationName: "万维公司",
    phone: "12345",
    meal: "no",
  });

  assert.equal(invalidOrganization.values, null);
  assert.equal(invalidPhone.values, null);
});

test("报名表单接受基础配置中的动态单位类型", () => {
  const parsed = parseRegistrationFormValues(
    {
      meetingId: "outreach-1",
      name: "张三",
      organizationType: "custom-organization-type",
      organizationName: "万维公司",
      phone: "13800138000",
      meal: "no",
    },
    new Set(["custom-organization-type"]),
  );

  assert.equal(parsed.error, null);
  assert.equal(parsed.values?.organizationType, "custom-organization-type");
});

test("后台会议表单接受基础配置中的动态业务字典", () => {
  const external = parseExternalForumFormValues({
    title: "行业论坛",
    organizer: "行业协会",
    meetingTime: "2026-07-21T09:00",
    location: "上海",
    attendeesText: "张三",
    hasSpeech: "no",
    speechTopic: "",
    speaker: "",
    cost: "1000",
    costType: "custom-cost-type",
    businessUnit: "市场部",
    sponsored: "no",
    sponsorshipType: "",
    purposes: ["custom-purpose"],
    outputs: ["custom-output"],
    followUp: "",
    notes: "",
  });
  const marketing = parseMarketingMeetingFormValues({
    title: "营销例会",
    businessUnit: "市场部",
    attendeesText: "张三",
    meetingTime: "2026-07-21T09:00",
    locationType: "online",
    onlineUrl: "https://meeting.example.com/room",
    offlineAddress: "",
    meetingType: "custom-meeting-type",
    conclusion: "",
    followUp: "",
    notes: "",
  });

  assert.equal(external.error, null);
  assert.deepEqual(external.values?.outputs, ["custom-output"]);
  assert.equal(marketing.error, null);
  assert.equal(marketing.values?.meetingType, "custom-meeting-type");
});

test("后台会议表单拒绝基础配置中不存在的业务字典值", () => {
  const external = parseExternalForumFormValues(
    {
      title: "行业论坛",
      organizer: "行业协会",
      meetingTime: "2026-07-21T09:00",
      location: "上海",
      attendeesText: "张三",
      hasSpeech: "no",
      speechTopic: "",
      speaker: "",
      cost: "1000",
      costType: "forged-cost-type",
      businessUnit: "市场部",
      sponsored: "no",
      sponsorshipType: "",
      purposes: [],
      outputs: [],
      followUp: "",
      notes: "",
    },
    {
      departments: new Set(["市场部"]),
      costTypes: new Set(["registration_fee"]),
      attendancePurposes: new Set(),
      meetingOutputs: new Set(),
    },
  );

  const marketing = parseMarketingMeetingFormValues(
    {
      title: "营销例会",
      businessUnit: "市场部",
      attendeesText: "张三",
      meetingTime: "2026-07-21T09:00",
      locationType: "online",
      onlineUrl: "https://meeting.example.com/room",
      offlineAddress: "",
      meetingType: "forged-meeting-type",
      conclusion: "",
      followUp: "",
      notes: "",
    },
    {
      departments: new Set(["市场部"]),
      marketingMeetingTypes: new Set(["regular"]),
    },
  );

  assert.equal(external.values, null);
  assert.equal(marketing.values, null);
});

test("CSV 导出阻止表格公式注入并保留 UTF-8 BOM", () => {
  const csv = buildCsv([
    ["姓名", "备注"],
    ["张三", "=HYPERLINK(\"https://example.com\")"],
  ]);

  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.com""\)"/);
  assert.ok(csv.endsWith("\r\n"));
});
