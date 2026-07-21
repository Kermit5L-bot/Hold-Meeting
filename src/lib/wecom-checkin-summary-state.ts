import path from "node:path";
import {
  mutateJsonCollection,
  readJsonCollection,
  type JsonCollectionConfig,
} from "@/lib/sqlite-json-collection";

export interface WecomCheckinSummaryState {
  meetingId: string;
  lastSentAt: string;
  lastCheckinCount: number;
  lastRegistrationCount: number;
  lastNotCheckedInCount: number;
  completedAt?: string;
}

const dataDir = path.join(process.cwd(), "data");
const statePath = path.join(dataDir, "wecom-checkin-summary-state.json");

interface StoredWecomCheckinSummaryState extends WecomCheckinSummaryState {
  id: string;
}

const stateCollection: JsonCollectionConfig<StoredWecomCheckinSummaryState> = {
  name: "wecom-checkin-summary-state",
  legacyPath: statePath,
  seedRecords: [],
  normalize: (state) => ({
    ...state,
    id: state.id || state.meetingId,
  }),
};

function toPublicState(state: StoredWecomCheckinSummaryState) {
  return {
    meetingId: state.meetingId,
    lastSentAt: state.lastSentAt,
    lastCheckinCount: state.lastCheckinCount,
    lastRegistrationCount: state.lastRegistrationCount,
    lastNotCheckedInCount: state.lastNotCheckedInCount,
    completedAt: state.completedAt,
  };
}

export async function readWecomCheckinSummaryStates() {
  return readJsonCollection(stateCollection).map(toPublicState);
}

export async function readWecomCheckinSummaryState(meetingId: string) {
  const states = await readWecomCheckinSummaryStates();
  return states.find((state) => state.meetingId === meetingId) ?? null;
}

export async function writeWecomCheckinSummaryState(
  nextState: WecomCheckinSummaryState,
) {
  mutateJsonCollection(stateCollection, (states) => ({
    records: [
      { ...nextState, id: nextState.meetingId },
      ...states.filter((state) => state.meetingId !== nextState.meetingId),
    ],
    result: undefined,
  }));
}
