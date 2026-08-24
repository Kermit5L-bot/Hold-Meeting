import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  getOutreachAccessIssue,
  getRegistrationDeadlineDate,
} from "../src/lib/outreach-meeting-access";
import type { OutreachMeeting } from "../src/lib/types";

const databasePath = path.join(
  tmpdir(),
  `hold-meeting-registration-deadline-${process.pid}.sqlite`,
);
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(`${databasePath}${suffix}`, { force: true });
}
process.env.REGISTRATIONS_DB_PATH = databasePath;

function meeting(
  overrides: Partial<OutreachMeeting> = {},
): OutreachMeeting {
  return {
    id: "outreach-deadline-test",
    ownerUserId: "admin-super-001",
    title: "报名截止测试会议",
    type: "outreach",
    startTime: "2026-07-21T10:00:00+08:00",
    endTime: "2026-07-21T12:00:00+08:00",
    registrationDeadline: "2026-07-21T09:00",
    locationType: "offline",
    location: "上海会议中心",
    status: "published",
    createdAt: "2026-07-01T09:00:00+08:00",
    updatedAt: "2026-07-01T09:00:00+08:00",
    registrationEnabled: true,
    checkinEnabled: true,
    mealEnabled: true,
    enableWecomNotify: false,
    enableWecomCheckinSummaryNotify: false,
    wecomCheckinSummaryIntervalMinutes: 15,
    registrationCount: 0,
    checkinCount: 0,
    walkInCount: 0,
    ...overrides,
  };
}

test("无时区报名截止时间按上海时间判断，截止时刻立即关闭", () => {
  const target = meeting();

  assert.equal(
    getOutreachAccessIssue(
      target,
      "registration",
      new Date("2026-07-21T00:59:59Z"),
    ),
    null,
  );

  const issue = getOutreachAccessIssue(
    target,
    "registration",
    new Date("2026-07-21T01:00:00Z"),
  );

  assert.equal(issue?.status, 409);
  assert.equal(issue?.code, "registration_deadline_passed");
  assert.equal(issue?.title, "报名已截止");
  assert.equal(
    getRegistrationDeadlineDate(target)?.toISOString(),
    "2026-07-21T01:00:00.000Z",
  );
});

test("旧会议未设置报名截止时间时以会议开始时间为准", () => {
  const target = meeting({ registrationDeadline: undefined });
  const issue = getOutreachAccessIssue(
    target,
    "registration",
    new Date("2026-07-21T02:00:00Z"),
  );

  assert.equal(issue?.code, "registration_deadline_passed");
  assert.equal(issue?.deadline, target.startTime);
});

test("报名截止不影响签到和现场补报名入口", () => {
  const issue = getOutreachAccessIssue(
    meeting(),
    "checkin",
    new Date("2026-07-21T03:00:00Z"),
  );

  assert.equal(issue, null);
});

test("管理员延长报名截止时间后同一会议立即恢复报名", () => {
  const now = new Date("2026-07-21T01:30:00Z");
  const closed = getOutreachAccessIssue(meeting(), "registration", now);
  const reopened = getOutreachAccessIssue(
    meeting({ registrationDeadline: "2026-07-21T10:00" }),
    "registration",
    now,
  );

  assert.equal(closed?.code, "registration_deadline_passed");
  assert.equal(reopened, null);
});

test("截止后报名接口返回明确错误且不写入报名记录", async () => {
  const { createOutreachMeeting } = await import(
    "../src/lib/outreach-meetings-store"
  );
  const { listRegistrationsByMeeting } = await import(
    "../src/lib/registrations-store"
  );
  const { POST } = await import("../src/app/api/registrations/route");
  const target = await createOutreachMeeting(
    {
      title: "已截止接口测试会议",
      type: "outreach",
      startTime: "2020-01-02T09:00",
      endTime: "2020-01-02T12:00",
      registrationDeadline: "2020-01-01T18:00",
      locationType: "offline",
      location: "上海会议中心",
      region: "",
      businessUnit: "",
      owner: "",
      status: "published",
      notes: "",
      coverImageUrl: "",
      enableWecomNotify: false,
      wecomWebhook: "",
      wecomGroupName: "",
      enableWecomCheckinSummaryNotify: false,
      wecomCheckinSummaryIntervalMinutes: 15,
    },
    "admin-super-001",
  );
  const response = await POST(
    new Request("http://localhost/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingId: target.id,
        name: "张三",
        organizationType: "company",
        otherOrganizationType: "",
        organizationName: "测试企业",
        position: "",
        phone: "13800138000",
        meal: "no",
        notes: "",
      }),
    }),
  );
  const body = (await response.json()) as { code?: string; message?: string };

  assert.equal(response.status, 409);
  assert.equal(body.code, "registration_deadline_passed");
  assert.match(body.message ?? "", /报名已结束/);
  assert.equal((await listRegistrationsByMeeting(target.id)).length, 0);
});
