import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import {
  mutateJsonCollection,
  readJsonCollection,
  type JsonCollectionConfig,
} from "@/lib/sqlite-json-collection";
import type { AdminModule } from "@/lib/types";

const scrypt = promisify(scryptCallback);
const dataDir = path.join(process.cwd(), "data");
const adminUsersPath = path.join(dataDir, "admin-users.json");

export const allAdminModules: AdminModule[] = [
  "outreach_meetings",
  "external_forums",
  "marketing_meetings",
];

export type AdminRole = "super_admin" | "admin";
export type AdminStatus = "active" | "disabled" | "deleted";

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  role: AdminRole;
  displayName: string;
  status: AdminStatus;
  permissions: AdminModule[];
  authVersion: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  deletedAt?: string;
}

export type PublicAdminUser = Omit<AdminUser, "passwordHash">;

function normalizeAdminUser(user: AdminUser): AdminUser {
  return {
    ...user,
    role: user.role === "admin" ? "admin" : "super_admin",
    status: user.status === "disabled" || user.status === "deleted" ? user.status : "active",
    permissions:
      user.role === "super_admin"
        ? [...allAdminModules]
        : (user.permissions ?? []).filter((item) => allAdminModules.includes(item)),
    authVersion: Number.isSafeInteger(user.authVersion) ? user.authVersion : 1,
  };
}

const adminUsersCollection: JsonCollectionConfig<AdminUser> = {
  name: "admin-users",
  legacyPath: adminUsersPath,
  seedRecords: [],
  normalize: normalizeAdminUser,
};

function getInitialPassword() {
  const password = process.env.ADMIN_INITIAL_PASSWORD?.trim() || "";
  if (process.env.NODE_ENV === "production" && password && password.length < 12) {
    throw new Error("生产环境的 ADMIN_INITIAL_PASSWORD 至少需要 12 个字符。");
  }
  return password;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedHash] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !storedHash) return false;
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(storedHash, "base64url");
  return derivedKey.length === storedKey.length && timingSafeEqual(derivedKey, storedKey);
}

async function ensureInitialSuperAdmin(users: AdminUser[]) {
  if (users.some((user) => user.role === "super_admin")) return users;
  const initialPassword = getInitialPassword();
  if (!initialPassword) return users;
  const timestamp = new Date().toISOString();
  const superAdmin: AdminUser = {
    id: "admin-super-001",
    username: "admin",
    passwordHash: await hashPassword(initialPassword),
    role: "super_admin",
    displayName: "超级管理员",
    status: "active",
    permissions: [...allAdminModules],
    authVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return mutateJsonCollection(adminUsersCollection, (currentUsers) => {
    if (currentUsers.some((user) => user.role === "super_admin")) {
      return { records: currentUsers, result: currentUsers };
    }
    const nextUsers = [superAdmin, ...currentUsers];
    return { records: nextUsers, result: nextUsers };
  });
}

export async function readAdminUsers() {
  return ensureInitialSuperAdmin(await readJsonCollection(adminUsersCollection));
}

export async function findAdminUserById(userId: string) {
  return (await readAdminUsers()).find((user) => user.id === userId) ?? null;
}

export async function findAdminUserByUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  return (await readAdminUsers()).find((user) => user.username.toLowerCase() === normalized) ?? null;
}

export function toPublicAdminUser(user: AdminUser): PublicAdminUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  void _passwordHash;
  return publicUser;
}

function validatePermissions(permissions: AdminModule[]) {
  const normalized = [...new Set(permissions)].filter((item) => allAdminModules.includes(item));
  if (normalized.length === 0) throw new Error("子账号至少需要授权一个业务模块。");
  return normalized;
}

export async function createAdminUser(input: {
  username: string;
  displayName: string;
  password: string;
  permissions: AdminModule[];
}) {
  const username = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) throw new Error("账号需为 3-50 位字母、数字、点、下划线或短横线。");
  if (!displayName || displayName.length > 50) throw new Error("显示名称需为 1-50 个字符。");
  if (input.password.length < 12 || input.password.length > 256) throw new Error("密码需为 12-256 个字符。");
  const permissions = validatePermissions(input.permissions);
  const passwordHash = await hashPassword(input.password);
  const timestamp = new Date().toISOString();
  return mutateJsonCollection(adminUsersCollection, (users) => {
    if (users.some((user) => user.username.toLowerCase() === username)) throw new Error("该账号已存在或已被删除，不能重复使用。");
    const user: AdminUser = {
      id: `admin-${randomUUID()}`,
      username,
      passwordHash,
      role: "admin",
      displayName,
      status: "active",
      permissions,
      authVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return { records: [user, ...users], result: user };
  });
}

export async function updateAdminUser(userId: string, input: {
  displayName?: string;
  permissions?: AdminModule[];
  status?: "active" | "disabled";
}) {
  return mutateJsonCollection(adminUsersCollection, (users) => {
    const existing = users.find((user) => user.id === userId);
    if (!existing || existing.role === "super_admin" || existing.status === "deleted") return { records: users, result: null };
    const displayName = input.displayName === undefined ? existing.displayName : input.displayName.trim();
    if (!displayName || displayName.length > 50) throw new Error("显示名称需为 1-50 个字符。");
    const permissions = input.permissions === undefined ? existing.permissions : validatePermissions(input.permissions);
    const status = input.status ?? existing.status;
    const authChanged = status !== existing.status || permissions.join(",") !== existing.permissions.join(",");
    const updated: AdminUser = {
      ...existing,
      displayName,
      permissions,
      status,
      authVersion: authChanged ? existing.authVersion + 1 : existing.authVersion,
      updatedAt: new Date().toISOString(),
    };
    return { records: users.map((user) => user.id === userId ? updated : user), result: updated };
  });
}

export async function resetAdminPassword(userId: string, password: string) {
  if (password.length < 12 || password.length > 256) throw new Error("密码需为 12-256 个字符。");
  const passwordHash = await hashPassword(password);
  return mutateJsonCollection(adminUsersCollection, (users) => {
    const existing = users.find((user) => user.id === userId);
    if (!existing || existing.role === "super_admin" || existing.status === "deleted") return { records: users, result: null };
    const updated = { ...existing, passwordHash, authVersion: existing.authVersion + 1, updatedAt: new Date().toISOString() };
    return { records: users.map((user) => user.id === userId ? updated : user), result: updated };
  });
}

export async function changeAdminPassword(userId: string, currentPassword: string, newPassword: string) {
  if (newPassword.length < 12 || newPassword.length > 256) throw new Error("新密码需为 12-256 个字符。");
  const user = await findAdminUserById(userId);
  if (!user || user.status !== "active" || !(await verifyPassword(currentPassword, user.passwordHash))) return false;
  const passwordHash = await hashPassword(newPassword);
  await mutateJsonCollection(adminUsersCollection, (users) => ({
    records: users.map((item) => item.id === userId ? { ...item, passwordHash, authVersion: item.authVersion + 1, updatedAt: new Date().toISOString() } : item),
    result: undefined,
  }));
  return true;
}

export async function softDeleteAdminUser(userId: string) {
  const timestamp = new Date().toISOString();
  return mutateJsonCollection(adminUsersCollection, (users) => {
    const existing = users.find((user) => user.id === userId);
    if (!existing || existing.role === "super_admin" || existing.status === "deleted") return { records: users, result: false };
    return {
      records: users.map((user) => user.id === userId ? { ...user, status: "deleted", deletedAt: timestamp, updatedAt: timestamp, authVersion: user.authVersion + 1 } : user),
      result: true,
    };
  });
}

export async function updateAdminLastLogin(userId: string) {
  const timestamp = new Date().toISOString();
  await mutateJsonCollection(adminUsersCollection, (users) => ({
    records: users.map((user) => user.id === userId ? { ...user, lastLoginAt: timestamp, updatedAt: timestamp } : user),
    result: undefined,
  }));
}
