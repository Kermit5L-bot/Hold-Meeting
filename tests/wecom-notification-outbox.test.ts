import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const testDir = path.join(tmpdir(), "hold-meeting-tests");
const databasePath = path.join(testDir, "wecom-outbox.sqlite");
mkdirSync(testDir, { recursive: true });
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(`${databasePath}${suffix}`, { force: true });
}
process.env.REGISTRATIONS_DB_PATH = databasePath;

test("报名和企业微信通知任务在同一数据流程中持久化并可重试", async () => {
  const registrationsStore = await import("../src/lib/registrations-store");
  const created = await registrationsStore.createRegistration({
    meetingId: "outreach-test",
    name: "测试用户",
    organizationType: "company",
    otherOrganizationType: "",
    organizationName: "测试公司",
    position: "",
    phone: "13800138000",
    meal: "no",
    notes: "",
  });

  assert.equal(created.ok, true);
  if (!created.ok) return;

  const firstClaimAt = new Date(Date.now() + 1000);
  const firstClaim = await registrationsStore.claimDueWecomNotificationJobs(
    10,
    firstClaimAt,
  );
  assert.equal(firstClaim.length, 1);
  assert.equal(firstClaim[0].registrationId, created.registration.id);
  assert.equal(firstClaim[0].kind, "registration");
  assert.equal(firstClaim[0].attemptCount, 1);

  const retryAt = new Date(firstClaimAt.getTime() + 60_000);
  await registrationsStore.failWecomNotificationJob(
    firstClaim[0],
    "临时网络失败",
    retryAt,
  );

  const tooEarly = await registrationsStore.claimDueWecomNotificationJobs(
    10,
    new Date(retryAt.getTime() - 1),
  );
  assert.equal(tooEarly.length, 0);

  const secondClaim = await registrationsStore.claimDueWecomNotificationJobs(
    10,
    retryAt,
  );
  assert.equal(secondClaim.length, 1);
  assert.equal(secondClaim[0].attemptCount, 2);

  await registrationsStore.completeWecomNotificationJob(secondClaim[0], true);
  const registration = await registrationsStore.findRegistrationById(
    created.registration.id,
  );
  assert.equal(registration?.wecomNotifyStatus, "success");

  const afterSuccess = await registrationsStore.claimDueWecomNotificationJobs(
    10,
    new Date(retryAt.getTime() + 24 * 60 * 60 * 1000),
  );
  assert.equal(afterSuccess.length, 0);
});

test("处理中断的通知任务会在超时后自动恢复", async () => {
  const registrationsStore = await import("../src/lib/registrations-store");
  const created = await registrationsStore.createWalkInRegistrationAndCheckin({
    meetingId: "outreach-recovery-test",
    name: "恢复测试用户",
    organizationType: "company",
    otherOrganizationType: "",
    organizationName: "测试公司",
    position: "",
    phone: "13900139000",
    meal: "no",
    notes: "",
  });

  assert.equal(created.ok, true);
  if (!created.ok) return;

  const firstClaimAt = new Date(Date.now() + 1000);
  const firstClaim = await registrationsStore.claimDueWecomNotificationJobs(
    10,
    firstClaimAt,
  );
  assert.equal(firstClaim.length, 1);
  assert.equal(firstClaim[0].kind, "walk_in_checkin");
  assert.equal(firstClaim[0].attemptCount, 1);

  const recoveredClaim = await registrationsStore.claimDueWecomNotificationJobs(
    10,
    new Date(firstClaimAt.getTime() + 2 * 60 * 1000 + 1),
  );
  assert.equal(recoveredClaim.length, 1);
  assert.equal(recoveredClaim[0].id, firstClaim[0].id);
  assert.equal(recoveredClaim[0].attemptCount, 2);

  await registrationsStore.failWecomNotificationJob(
    recoveredClaim[0],
    "达到重试上限",
    null,
  );
  const deadJobs = await registrationsStore.listWecomNotificationJobsByMeeting(
    "outreach-recovery-test",
  );
  assert.equal(deadJobs[0].status, "dead");

  const retriedCount =
    await registrationsStore.retryFailedWecomNotificationJobs(
      "outreach-recovery-test",
    );
  assert.equal(retriedCount, 1);

  const manualRetry = await registrationsStore.claimDueWecomNotificationJobs(
    10,
    new Date(Date.now() + 1000),
  );
  assert.equal(manualRetry.length, 1);
  assert.equal(manualRetry[0].attemptCount, 1);
  await registrationsStore.completeWecomNotificationJob(manualRetry[0], false);

  const skippedJobs = await registrationsStore.listWecomNotificationJobsByMeeting(
    "outreach-recovery-test",
  );
  assert.equal(skippedJobs[0].status, "skipped");
});
