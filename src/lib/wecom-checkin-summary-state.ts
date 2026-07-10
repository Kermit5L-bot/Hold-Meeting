import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface WecomCheckinSummaryState {
  meetingId: string;
  lastSentAt: string;
  lastCheckinCount: number;
  lastRegistrationCount: number;
  lastNotCheckedInCount: number;
}

const dataDir = path.join(process.cwd(), "data");
const statePath = path.join(dataDir, "wecom-checkin-summary-state.json");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

export async function readWecomCheckinSummaryStates() {
  await ensureDataDir();

  try {
    const raw = await readFile(statePath, "utf8");
    const parsed = JSON.parse(raw) as WecomCheckinSummaryState[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function readWecomCheckinSummaryState(meetingId: string) {
  const states = await readWecomCheckinSummaryStates();
  return states.find((state) => state.meetingId === meetingId) ?? null;
}

export async function writeWecomCheckinSummaryState(
  nextState: WecomCheckinSummaryState,
) {
  const states = await readWecomCheckinSummaryStates();
  const nextStates = [
    nextState,
    ...states.filter((state) => state.meetingId !== nextState.meetingId),
  ];

  await writeFile(statePath, `${JSON.stringify(nextStates, null, 2)}\n`, "utf8");
}
