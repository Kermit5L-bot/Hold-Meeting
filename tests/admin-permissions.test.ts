import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { AdminUser } from "../src/lib/admin-users";

const testDirectory = mkdtempSync(path.join(tmpdir(), "hold-meeting-admin-test-"));
process.env.REGISTRATIONS_DB_PATH = path.join(testDirectory, "permissions.sqlite");
process.env.ADMIN_INITIAL_PASSWORD = "Admin-Test-Password-123";

const accessPromise = import("../src/lib/admin-access");
const usersStorePromise = import("../src/lib/admin-users");

function user(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: "admin-a",
    username: "admin-a",
    passwordHash: "unused",
    role: "admin",
    displayName: "账号 A",
    status: "active",
    permissions: ["outreach_meetings"],
    authVersion: 1,
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

test("子账号只能解析自己的数据范围", async () => {
  const access = await accessPromise;
  const account = user();
  assert.deepEqual(access.resolveAccountScope(account), {
    requested: account.id,
    ownerUserIds: [account.id],
    targetOwnerUserId: account.id,
  });
  assert.equal(access.resolveAccountScope(account, "admin-b"), null);
  assert.equal(access.resolveAccountScope(account, "all"), null);
});

test("超级管理员默认看自己并可切换全部或指定账号", async () => {
  const access = await accessPromise;
  const superAdmin = user({ id: "admin-super-001", role: "super_admin", permissions: [] });
  assert.deepEqual(access.resolveAccountScope(superAdmin)?.ownerUserIds, [superAdmin.id]);
  assert.equal(access.resolveAccountScope(superAdmin, "all")?.ownerUserIds, null);
  assert.deepEqual(access.resolveAccountScope(superAdmin, "admin-b")?.ownerUserIds, ["admin-b"]);
});

test("模块授权和记录归属同时生效", async () => {
  const access = await accessPromise;
  const account = user();
  const scope = access.resolveAccountScope(account);
  assert.ok(scope);
  assert.equal(access.hasAdminModule(account, "outreach_meetings"), true);
  assert.equal(access.hasAdminModule(account, "external_forums"), false);
  assert.equal(access.recordInScope("admin-a", scope), true);
  assert.equal(access.recordInScope("admin-b", scope), false);
});

test("子账号生命周期保留用户名并使旧会话版本失效", async () => {
  const usersStore = await usersStorePromise;
  const initialUsers = await usersStore.readAdminUsers();
  assert.equal(initialUsers.filter((item) => item.role === "super_admin").length, 1);
  const created = await usersStore.createAdminUser({
    username: "account-test",
    displayName: "测试账号",
    password: "Account-Test-Password-123",
    permissions: ["outreach_meetings"],
  });
  const disabled = await usersStore.updateAdminUser(created.id, { status: "disabled" });
  assert.equal(disabled?.status, "disabled");
  assert.equal(disabled?.authVersion, created.authVersion + 1);
  const reset = await usersStore.resetAdminPassword(created.id, "Account-New-Password-123");
  assert.equal(reset?.authVersion, (disabled?.authVersion ?? 0) + 1);
  assert.equal(await usersStore.softDeleteAdminUser(created.id), true);
  assert.equal((await usersStore.findAdminUserById(created.id))?.status, "deleted");
  await assert.rejects(
    usersStore.createAdminUser({
      username: "account-test",
      displayName: "重复账号",
      password: "Account-Test-Password-456",
      permissions: ["external_forums"],
    }),
    /不能重复使用/,
  );
});
