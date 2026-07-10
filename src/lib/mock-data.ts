import {
  currencyFormatter,
  numberFormatter,
  percentFormatter,
} from "@/lib/utils";
import type {
  DashboardMetric,
  ExternalForumMeeting,
  MarketingCenterMeeting,
  Meeting,
  OutreachMeeting,
} from "@/lib/types";

export const outreachMeetings: OutreachMeeting[] = [
  {
    id: "outreach-001",
    title: "华东区域生态环境客户交流会",
    type: "outreach",
    startTime: "2026-07-18T09:30:00+08:00",
    endTime: "2026-07-18T16:30:00+08:00",
    locationType: "offline",
    location: "上海市浦东新区会议中心",
    region: "华东",
    businessUnit: "环境事业部",
    owner: "客工组",
    status: "published",
    createdAt: "2026-07-01T10:00:00+08:00",
    updatedAt: "2026-07-05T15:20:00+08:00",
    registrationEnabled: true,
    checkinEnabled: false,
    mealEnabled: true,
    coverImageUrl: "",
    enableWecomNotify: false,
    wecomWebhook: "",
    wecomGroupName: "",
    enableWecomCheckinSummaryNotify: false,
    wecomCheckinSummaryIntervalMinutes: 15,
    registrationCount: 86,
    checkinCount: 0,
    walkInCount: 0,
  },
  {
    id: "outreach-002",
    title: "第三方检测机构技术沙龙",
    type: "outreach",
    startTime: "2026-06-21T13:30:00+08:00",
    endTime: "2026-06-21T17:00:00+08:00",
    locationType: "offline",
    location: "广州科学城",
    region: "华南",
    businessUnit: "检测业务线",
    owner: "市场部",
    status: "ended",
    createdAt: "2026-06-01T09:10:00+08:00",
    updatedAt: "2026-06-22T11:00:00+08:00",
    registrationEnabled: false,
    checkinEnabled: false,
    mealEnabled: true,
    coverImageUrl: "",
    enableWecomNotify: false,
    wecomWebhook: "",
    wecomGroupName: "",
    enableWecomCheckinSummaryNotify: false,
    wecomCheckinSummaryIntervalMinutes: 15,
    registrationCount: 124,
    checkinCount: 102,
    walkInCount: 17,
  },
];

export const externalForumMeetings: ExternalForumMeeting[] = [
  {
    id: "forum-001",
    title: "中国环境监测产业发展论坛",
    type: "external_forum",
    organizer: "行业协会",
    startTime: "2026-05-12T09:00:00+08:00",
    locationType: "offline",
    location: "北京国际会议中心",
    region: "华北",
    businessUnit: "环境事业部",
    owner: "品牌组",
    status: "ended",
    attendees: ["李明", "周岚"],
    hasSpeech: true,
    speaker: "李明",
    speechTopic: "生态环境数字化监测实践",
    cost: 36000,
    sponsored: true,
    createdAt: "2026-04-20T08:30:00+08:00",
    updatedAt: "2026-05-15T18:20:00+08:00",
  },
  {
    id: "forum-002",
    title: "高校实验室安全与运维研讨会",
    type: "external_forum",
    organizer: "高校联盟",
    startTime: "2026-04-08T10:00:00+08:00",
    locationType: "offline",
    location: "南京",
    region: "华东",
    businessUnit: "教育行业线",
    owner: "市场部",
    status: "ended",
    attendees: ["陈洁"],
    hasSpeech: false,
    cost: 4800,
    sponsored: false,
    createdAt: "2026-03-28T14:00:00+08:00",
    updatedAt: "2026-04-09T12:10:00+08:00",
  },
];

export const marketingMeetings: MarketingCenterMeeting[] = [
  {
    id: "marketing-001",
    title: "营销中心月度复盘会",
    type: "marketing_center",
    startTime: "2026-07-03T14:00:00+08:00",
    locationType: "online",
    location: "企业微信会议",
    businessUnit: "营销中心",
    owner: "市场部",
    status: "ended",
    attendees: ["市场部", "客工组", "品牌组"],
    internalMeetingType: "复盘会",
    conclusion: "统一下半年重点活动数据口径。",
    createdAt: "2026-07-01T09:00:00+08:00",
    updatedAt: "2026-07-03T16:00:00+08:00",
  },
  {
    id: "marketing-002",
    title: "重点行业线索跟进协调会",
    type: "marketing_center",
    startTime: "2026-06-14T10:00:00+08:00",
    locationType: "offline",
    location: "总部 12F 会议室",
    businessUnit: "营销中心",
    owner: "客工组",
    status: "ended",
    attendees: ["市场部", "销售运营"],
    internalMeetingType: "协调会",
    createdAt: "2026-06-10T17:30:00+08:00",
    updatedAt: "2026-06-14T11:30:00+08:00",
  },
];

export const meetings: Meeting[] = [
  ...outreachMeetings,
  ...externalForumMeetings,
  ...marketingMeetings,
];

const outreachCount = outreachMeetings.length;
const forumCount = externalForumMeetings.length;
const marketingCount = marketingMeetings.length;
const registrations = outreachMeetings.reduce(
  (sum, meeting) => sum + meeting.registrationCount,
  0,
);
const checkins = outreachMeetings.reduce(
  (sum, meeting) => sum + meeting.checkinCount,
  0,
);
const forumCost = externalForumMeetings.reduce(
  (sum, meeting) => sum + meeting.cost,
  0,
);

export const dashboardMetrics: DashboardMetric[] = [
  {
    label: "年度会议总数",
    value: numberFormatter.format(meetings.length),
    hint: "三类会议合计",
    tone: "brand",
  },
  {
    label: "累计报名人数",
    value: numberFormatter.format(registrations),
    hint: "仅统计外联会议",
    tone: "success",
  },
  {
    label: "累计签到人数",
    value: numberFormatter.format(checkins),
    hint: `到场率 ${registrations ? percentFormatter.format(checkins / registrations) : "0%"}`,
    tone: "warning",
  },
  {
    label: "外部会议费用",
    value: currencyFormatter.format(forumCost),
    hint: "论坛、赞助、展位等费用",
    tone: "neutral",
  },
];

export const meetingTypeSummary = [
  {
    label: "外联会议 / 我司承办会议",
    value: numberFormatter.format(outreachCount),
    description: "承载报名、签到、补报名和二维码入口。",
  },
  {
    label: "外部会议&论坛",
    value: numberFormatter.format(forumCount),
    description: "记录参会、赞助、演讲、费用和产出。",
  },
  {
    label: "营销中心会议",
    value: numberFormatter.format(marketingCount),
    description: "记录内部会议、培训、协调和复盘事项。",
  },
];
