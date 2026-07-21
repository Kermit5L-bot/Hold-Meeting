import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createPublicSuccessToken,
  createSessionToken,
  verifyPublicSuccessToken,
  verifySessionToken,
} from "../src/lib/auth-session";
import { cleanupOrphanedOutreachCovers } from "../src/lib/outreach-cover-cleanup-job";
import { consumePublicApiRateLimit } from "../src/lib/public-api-rate-limit";
import { getRequestClientKey } from "../src/lib/request-client";
import { hasCompletedCheckinSummary } from "../src/lib/wecom-checkin-summary-job";

test("公开接口限流按客户端和窗口生效", () => {
  const request = new Request("https://meeting.example/api/checkins/lookup", {
    headers: { "x-real-ip": "203.0.113.8" },
  });
  const options = {
    request,
    scope: `test-${Date.now()}`,
    limit: 2,
    windowMs: 10_000,
  };

  assert.equal(consumePublicApiRateLimit({ ...options, now: 1000 }).allowed, true);
  assert.equal(consumePublicApiRateLimit({ ...options, now: 1001 }).allowed, true);
  const blocked = consumePublicApiRateLimit({ ...options, now: 1002 });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 10);
  assert.equal(consumePublicApiRateLimit({ ...options, now: 11_000 }).allowed, true);
});

test("客户端标识优先使用反向代理提供的真实地址", () => {
  const realIpRequest = new Request("https://meeting.example", {
    headers: {
      "x-real-ip": "203.0.113.9",
      "x-forwarded-for": "198.51.100.1, 198.51.100.2",
    },
  });
  const forwardedRequest = new Request("https://meeting.example", {
    headers: { "x-forwarded-for": "198.51.100.1, 198.51.100.2" },
  });

  assert.equal(getRequestClientKey(realIpRequest), "203.0.113.9");
  assert.equal(getRequestClientKey(forwardedRequest), "198.51.100.1");
});

test("客户端标识使用转发链中的原始客户端地址", () => {
  const request = new Request("https://example.com", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.8, 10.0.0.9",
    },
  });

  assert.equal(getRequestClientKey(request), "203.0.113.10");
});

test("会话校验拒绝附加额外数据段的令牌", async () => {
  const token = await createSessionToken({
    userId: "admin-1",
    username: "admin",
    role: "super_admin",
    displayName: "管理员",
    authVersion: 1,
    exp: Math.floor(Date.now() / 1000) + 60,
  });

  assert.ok(await verifySessionToken(token));
  assert.equal(await verifySessionToken(`${token}.extra`), null);
});

test("移动端成功令牌可验证且拒绝篡改和过期内容", async () => {
  const token = await createPublicSuccessToken({
    registrationId: "reg-1",
    meetingId: "meeting-1",
    type: "registration",
  });
  const payload = await verifyPublicSuccessToken(token);

  assert.equal(payload?.registrationId, "reg-1");
  assert.equal(await verifyPublicSuccessToken(`${token}x`), null);

  const expired = await createPublicSuccessToken(
    {
      registrationId: "reg-1",
      meetingId: "meeting-1",
      type: "registration",
    },
    -1,
  );
  assert.equal(await verifyPublicSuccessToken(expired), null);
});

test("签到汇总达到百分之百后保持终止状态", () => {
  const stats = {
    registrationCount: 3,
    checkinCount: 3,
    notCheckedInCount: 0,
    walkInCount: 1,
  };
  const state = {
    meetingId: "meeting-1",
    lastSentAt: "2026-07-21T10:00:00.000Z",
    lastCheckinCount: 3,
    lastRegistrationCount: 3,
    lastNotCheckedInCount: 0,
  };

  assert.equal(hasCompletedCheckinSummary(state, stats), true);
  assert.equal(
    hasCompletedCheckinSummary(
      { ...state, lastCheckinCount: 2, completedAt: state.lastSentAt },
      stats,
    ),
    true,
  );
});

test("头图清理只删除过期且未引用的系统文件", async (context) => {
  const directory = mkdtempSync(path.join(tmpdir(), "hold-meeting-covers-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));

  const referencedName = "cover-referenced.jpg";
  const orphanName = "cover-orphan.png";
  const recentName = "cover-recent.webp";
  const unrelatedName = "manual-note.txt";
  for (const fileName of [referencedName, orphanName, recentName, unrelatedName]) {
    writeFileSync(path.join(directory, fileName), fileName);
  }

  const now = new Date("2026-07-21T12:00:00.000Z");
  const oldTime = new Date(now.getTime() - 25 * 60 * 60 * 1000);
  for (const fileName of [referencedName, orphanName, unrelatedName]) {
    utimesSync(path.join(directory, fileName), oldTime, oldTime);
  }

  const deletedCount = await cleanupOrphanedOutreachCovers(now, {
    uploadDirectory: directory,
    referencedCoverUrls: [`/uploads/outreach-covers/${referencedName}`],
  });

  assert.equal(deletedCount, 1);
  assert.equal(readFileSync(path.join(directory, referencedName), "utf8"), referencedName);
  assert.equal(readFileSync(path.join(directory, recentName), "utf8"), recentName);
  assert.equal(readFileSync(path.join(directory, unrelatedName), "utf8"), unrelatedName);
  assert.throws(() => readFileSync(path.join(directory, orphanName)));
});
