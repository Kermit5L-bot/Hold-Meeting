import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const dataDir = path.join(process.cwd(), "data");
const adminUsersPath = path.join(dataDir, "admin-users.json");

export type AdminRole = "super_admin";
export type AdminStatus = "active" | "disabled";

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  role: AdminRole;
  displayName: string;
  status: AdminStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

function getInitialPassword() {
  return process.env.ADMIN_INITIAL_PASSWORD?.trim() || "";
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedHash] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(storedHash, "base64url");

  if (derivedKey.length !== storedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedKey);
}

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

async function writeAdminUsers(users: AdminUser[]) {
  await ensureDataDir();
  await writeFile(adminUsersPath, `${JSON.stringify(users, null, 2)}\n`, "utf8");
}

async function readRawAdminUsers() {
  await ensureDataDir();

  try {
    const raw = await readFile(adminUsersPath, "utf8");
    const parsed = JSON.parse(raw) as AdminUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function ensureInitialSuperAdmin(users: AdminUser[]) {
  const hasSuperAdmin = users.some((user) => user.role === "super_admin");

  if (hasSuperAdmin) {
    return users;
  }

  const initialPassword = getInitialPassword();

  if (!initialPassword) {
    await writeAdminUsers(users);
    return users;
  }

  const timestamp = new Date().toISOString();
  const superAdmin: AdminUser = {
    id: "admin-super-001",
    username: "admin",
    passwordHash: await hashPassword(initialPassword),
    role: "super_admin",
    displayName: "超级管理员",
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const nextUsers = [superAdmin, ...users];
  await writeAdminUsers(nextUsers);
  return nextUsers;
}

export async function readAdminUsers() {
  const users = await readRawAdminUsers();
  return ensureInitialSuperAdmin(users);
}

export async function findAdminUserByUsername(username: string) {
  const users = await readAdminUsers();
  const normalizedUsername = username.trim().toLowerCase();
  return (
    users.find((user) => user.username.toLowerCase() === normalizedUsername) ??
    null
  );
}

export async function updateAdminLastLogin(userId: string) {
  const users = await readAdminUsers();
  const timestamp = new Date().toISOString();
  const nextUsers = users.map((user) =>
    user.id === userId
      ? {
          ...user,
          lastLoginAt: timestamp,
          updatedAt: timestamp,
        }
      : user,
  );

  await writeAdminUsers(nextUsers);
}
