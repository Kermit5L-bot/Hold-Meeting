import { meetingOutputLabels } from "@/lib/external-forum-options";
import { internalMeetingTypeLabels } from "@/lib/marketing-meeting-options";
import { organizationTypeLabels } from "@/lib/registration-options";
import type {
  ExternalForumRecord,
  MarketingMeetingRecord,
  OutreachMeeting,
  Registration,
} from "@/lib/types";

export interface DashboardFilters {
  year: string;
  month: string;
  businessUnit: string;
  region: string;
}

export interface RankItem {
  label: string;
  value: number;
}

export const currentDashboardYear = String(new Date().getFullYear());

export const defaultDashboardFilters: DashboardFilters = {
  year: currentDashboardYear,
  month: "all",
  businessUnit: "all",
  region: "all",
};

export function getDashboardYear(value: string) {
  return new Date(value).getFullYear().toString();
}

function getMonth(value: string) {
  return String(new Date(value).getMonth() + 1);
}

function matchesDate(value: string, filters: DashboardFilters) {
  return (
    getDashboardYear(value) === filters.year &&
    (filters.month === "all" || getMonth(value) === filters.month)
  );
}

function matchesOption(value: string | undefined, selected: string) {
  return selected === "all" || (value || "未填写") === selected;
}

function addToRank(map: Map<string, number>, label: string, amount = 1) {
  map.set(label, (map.get(label) ?? 0) + amount);
}

export function mapToRank(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function monthlyCounts<T>(items: T[], getDate: (item: T) => string) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    label: `${index + 1}月`,
    value: 0,
  }));

  for (const item of items) {
    const month = new Date(getDate(item)).getMonth();

    if (month >= 0 && month < 12) {
      months[month].value += 1;
    }
  }

  return months;
}

export function uniqueDashboardOptions(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value || "未填写"))).sort(
    (a, b) => a.localeCompare(b, "zh-Hans-CN"),
  );
}

export function getDashboardYears({
  outreachMeetings,
  externalForums,
  marketingMeetings,
}: {
  outreachMeetings: OutreachMeeting[];
  externalForums: ExternalForumRecord[];
  marketingMeetings: MarketingMeetingRecord[];
}) {
  const allYears = new Set<string>([currentDashboardYear]);
  outreachMeetings.forEach((meeting) =>
    allYears.add(getDashboardYear(meeting.startTime)),
  );
  externalForums.forEach((meeting) =>
    allYears.add(getDashboardYear(meeting.meetingTime)),
  );
  marketingMeetings.forEach((meeting) =>
    allYears.add(getDashboardYear(meeting.meetingTime)),
  );
  return Array.from(allYears).sort((a, b) => Number(b) - Number(a));
}

export function buildDashboardStats({
  outreachMeetings,
  registrations,
  externalForums,
  marketingMeetings,
  filters,
}: {
  outreachMeetings: OutreachMeeting[];
  registrations: Registration[];
  externalForums: ExternalForumRecord[];
  marketingMeetings: MarketingMeetingRecord[];
  filters: DashboardFilters;
}) {
  const filteredOutreach = outreachMeetings.filter(
    (meeting) =>
      matchesDate(meeting.startTime, filters) &&
      matchesOption(meeting.businessUnit, filters.businessUnit) &&
      matchesOption(meeting.region, filters.region),
  );
  const filteredOutreachForTrend = outreachMeetings.filter(
    (meeting) =>
      getDashboardYear(meeting.startTime) === filters.year &&
      matchesOption(meeting.businessUnit, filters.businessUnit) &&
      matchesOption(meeting.region, filters.region),
  );
  const outreachById = new Map(
    filteredOutreach.map((meeting) => [meeting.id, meeting]),
  );
  const outreachIds = new Set(outreachById.keys());
  const filteredRegistrations = registrations.filter(
    (registration) =>
      outreachIds.has(registration.meetingId) &&
      registration.status === "registered",
  );
  const checkedIn = filteredRegistrations.filter(
    (registration) => registration.checkinStatus === "checked_in",
  );
  const walkIns = filteredRegistrations.filter(
    (registration) => registration.isWalkIn || registration.source === "walk_in",
  );
  const mealCount = filteredRegistrations.filter(
    (registration) => registration.meal === "yes",
  ).length;

  const unitTypeMap = new Map<string, number>();
  const regionMap = new Map<string, number>();
  const registrationRankMap = new Map<string, number>();
  const checkinRankMap = new Map<string, number>();

  for (const registration of filteredRegistrations) {
    const meeting = outreachById.get(registration.meetingId);
    addToRank(
      unitTypeMap,
      registration.organizationType === "other"
        ? registration.otherOrganizationType || "其他"
        : organizationTypeLabels[registration.organizationType],
    );
    addToRank(regionMap, meeting?.region || "未填写区域");
    addToRank(registrationRankMap, meeting?.title || registration.meetingId);

    if (registration.checkinStatus === "checked_in") {
      addToRank(checkinRankMap, meeting?.title || registration.meetingId);
    }
  }

  const filteredExternal = externalForums.filter(
    (meeting) =>
      matchesDate(meeting.meetingTime, filters) &&
      matchesOption(meeting.businessUnit, filters.businessUnit),
  );
  const filteredExternalForTrend = externalForums.filter(
    (meeting) =>
      getDashboardYear(meeting.meetingTime) === filters.year &&
      matchesOption(meeting.businessUnit, filters.businessUnit),
  );
  const externalCost = filteredExternal.reduce(
    (sum, meeting) => sum + (meeting.cost ?? 0),
    0,
  );
  const externalSpeechCount = filteredExternal.filter(
    (meeting) => meeting.hasSpeech,
  ).length;
  const sponsoredCount = filteredExternal.filter(
    (meeting) => meeting.sponsored,
  ).length;
  const externalBusinessUnitMap = new Map<string, number>();
  const speakerMap = new Map<string, number>();
  const organizerMap = new Map<string, number>();
  const outputMap = new Map<string, number>();

  for (const meeting of filteredExternal) {
    addToRank(externalBusinessUnitMap, meeting.businessUnit || "未填写部门");
    addToRank(organizerMap, meeting.organizer || "未填写主办单位");

    if (meeting.hasSpeech && meeting.speaker) {
      addToRank(speakerMap, meeting.speaker);
    }

    for (const output of meeting.outputs) {
      addToRank(outputMap, meetingOutputLabels[output]);
    }
  }

  const filteredMarketing = marketingMeetings.filter(
    (meeting) =>
      matchesDate(meeting.meetingTime, filters) &&
      matchesOption(meeting.businessUnit, filters.businessUnit),
  );
  const filteredMarketingForTrend = marketingMeetings.filter(
    (meeting) =>
      getDashboardYear(meeting.meetingTime) === filters.year &&
      matchesOption(meeting.businessUnit, filters.businessUnit),
  );
  const marketingBusinessUnitMap = new Map<string, number>();
  const marketingTypeMap = new Map<string, number>();

  for (const meeting of filteredMarketing) {
    addToRank(marketingBusinessUnitMap, meeting.businessUnit || "未填写部门");
    addToRank(
      marketingTypeMap,
      meeting.meetingType ? internalMeetingTypeLabels[meeting.meetingType] : "未填写",
    );
  }

  const registrationCount = filteredRegistrations.length;
  const checkinCount = checkedIn.length;
  const notCheckedInCount = Math.max(registrationCount - checkinCount, 0);

  return {
    outreach: {
      meetingCount: filteredOutreach.length,
      registrationCount,
      checkinCount,
      notCheckedInCount,
      walkInCount: walkIns.length,
      attendanceRate: registrationCount ? checkinCount / registrationCount : 0,
      mealCount,
      unitTypeRanking: mapToRank(unitTypeMap),
      regionParticipation: mapToRank(regionMap),
      registrationRanking: mapToRank(registrationRankMap),
      checkinRanking: mapToRank(checkinRankMap),
      monthlyTrend: monthlyCounts(
        filteredOutreachForTrend,
        (meeting) => meeting.startTime,
      ),
    },
    external: {
      meetingCount: filteredExternal.length,
      costTotal: externalCost,
      speechCount: externalSpeechCount,
      sponsoredCount,
      businessUnitRanking: mapToRank(externalBusinessUnitMap),
      costRanking: filteredExternal
        .map((meeting) => ({ label: meeting.title, value: meeting.cost ?? 0 }))
        .sort((a, b) => b.value - a.value),
      speakerStats: mapToRank(speakerMap),
      organizerStats: mapToRank(organizerMap),
      outputStats: mapToRank(outputMap),
      monthlyTrend: monthlyCounts(
        filteredExternalForTrend,
        (meeting) => meeting.meetingTime,
      ),
    },
    marketing: {
      meetingCount: filteredMarketing.length,
      onlineCount: filteredMarketing.filter(
        (meeting) => meeting.locationType === "online",
      ).length,
      offlineCount: filteredMarketing.filter(
        (meeting) => meeting.locationType === "offline",
      ).length,
      attendeeCount: filteredMarketing.reduce(
        (sum, meeting) => sum + meeting.attendees.length,
        0,
      ),
      businessUnitRanking: mapToRank(marketingBusinessUnitMap),
      typeDistribution: mapToRank(marketingTypeMap),
      monthlyTrend: monthlyCounts(
        filteredMarketingForTrend,
        (meeting) => meeting.meetingTime,
      ),
    },
  };
}
