import { isValidWecomWebhook } from "@/lib/wecom-notifier";
import type {
  ExternalForumFormValues,
  MarketingMeetingFormValues,
  MeetingFormValues,
} from "@/lib/types";

type ParseResult<T> =
  | { values: T; error: null }
  | { values: null; error: string };

export interface AdminFormAllowedValues {
  departments?: ReadonlySet<string>;
  regions?: ReadonlySet<string>;
  costTypes?: ReadonlySet<string>;
  attendancePurposes?: ReadonlySet<string>;
  meetingOutputs?: ReadonlySet<string>;
  marketingMeetingTypes?: ReadonlySet<string>;
}

function isUnknownOption(value: string, allowed?: ReadonlySet<string>) {
  return Boolean(value && allowed && !allowed.has(value));
}

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : null;
}

function stringValue(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "string" ? record[key].trim() : "";
}

function booleanValue(record: Record<string, unknown>, key: string) {
  return record[key] === true;
}

function hasOversizedValue(values: Array<[string, number]>) {
  return values.some(([value, maxLength]) => value.length > maxLength);
}

function isValidLocalDateTime(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "00"] =
    match;
  const date = new Date(
    `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText}+08:00`,
  );
  const localDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  return (
    !Number.isNaN(date.getTime()) &&
    localDate.getUTCFullYear() === Number(yearText) &&
    localDate.getUTCMonth() + 1 === Number(monthText) &&
    localDate.getUTCDate() === Number(dayText) &&
    localDate.getUTCHours() === Number(hourText) &&
    localDate.getUTCMinutes() === Number(minuteText) &&
    localDate.getUTCSeconds() === Number(secondText)
  );
}

function localDateTimeMs(value: string) {
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}+08:00`).getTime();
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (
    value.some(
      (item) =>
        typeof item !== "string" || !item.trim() || item.trim().length > 100,
    )
  ) {
    return null;
  }

  return [...new Set(value.map((item) => (item as string).trim()))];
}

export function parseMeetingFormValues(
  input: unknown,
  allowed: AdminFormAllowedValues = {},
): ParseResult<MeetingFormValues> {
  const record = asRecord(input);

  if (!record) {
    return { values: null, error: "提交数据格式无效。" };
  }

  const title = stringValue(record, "title");
  const startTime = stringValue(record, "startTime");
  const endTime = stringValue(record, "endTime");
  const registrationDeadline = stringValue(record, "registrationDeadline");
  const locationType = stringValue(record, "locationType");
  const location = stringValue(record, "location");
  const region = stringValue(record, "region");
  const businessUnit = stringValue(record, "businessUnit");
  const owner = stringValue(record, "owner");
  const status = stringValue(record, "status");
  const notes = stringValue(record, "notes");
  const coverImageUrl = stringValue(record, "coverImageUrl");
  const wecomWebhook = stringValue(record, "wecomWebhook");
  const wecomGroupName = stringValue(record, "wecomGroupName");
  const enableWecomNotify = booleanValue(record, "enableWecomNotify");
  const enableWecomCheckinSummaryNotify = booleanValue(
    record,
    "enableWecomCheckinSummaryNotify",
  );
  const interval = record.wecomCheckinSummaryIntervalMinutes;

  if (!title) return { values: null, error: "请填写会议主题。" };
  if (!isValidLocalDateTime(startTime)) {
    return { values: null, error: "请选择有效的会议开始时间。" };
  }
  if (endTime && !isValidLocalDateTime(endTime)) {
    return { values: null, error: "请选择有效的会议结束时间。" };
  }
  if (registrationDeadline && !isValidLocalDateTime(registrationDeadline)) {
    return { values: null, error: "请选择有效的报名截止时间。" };
  }
  if (endTime && localDateTimeMs(endTime) < localDateTimeMs(startTime)) {
    return { values: null, error: "会议结束时间不能早于会议开始时间。" };
  }
  if (locationType !== "online" && locationType !== "offline") {
    return { values: null, error: "请选择有效的地点类型。" };
  }
  if (!location) return { values: null, error: "请填写会议地点。" };
  if (isUnknownOption(region, allowed.regions)) {
    return { values: null, error: "所属区域不在基础配置中。" };
  }
  if (isUnknownOption(businessUnit, allowed.departments)) {
    return { values: null, error: "所属部门不在基础配置中。" };
  }
  if (!["draft", "published", "ended", "archived"].includes(status)) {
    return { values: null, error: "请选择有效的会议状态。" };
  }
  if (interval !== 10 && interval !== 15 && interval !== 30) {
    return { values: null, error: "请选择有效的签到汇总频率。" };
  }
  if (enableWecomNotify && !isValidWecomWebhook(wecomWebhook)) {
    return {
      values: null,
      error: "请输入有效的企业微信群机器人 HTTPS Webhook。",
    };
  }
  if (
    coverImageUrl &&
    !/^\/uploads\/outreach-covers\/(?![A-Za-z0-9._-]*\.\.)[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)$/i.test(
      coverImageUrl,
    )
  ) {
    return { values: null, error: "会议头图地址无效，请重新上传图片。" };
  }
  if (
    hasOversizedValue([
      [title, 200],
      [location, 300],
      [region, 100],
      [businessUnit, 100],
      [owner, 100],
      [notes, 2000],
      [coverImageUrl, 500],
      [wecomWebhook, 500],
      [wecomGroupName, 100],
    ])
  ) {
    return { values: null, error: "部分字段内容过长，请精简后重试。" };
  }

  return {
    values: {
      title,
      type: "outreach",
      startTime,
      endTime,
      registrationDeadline,
      locationType,
      location,
      region,
      businessUnit,
      owner,
      status: status as MeetingFormValues["status"],
      notes,
      coverImageUrl,
      enableWecomNotify,
      wecomWebhook,
      wecomGroupName,
      enableWecomCheckinSummaryNotify,
      wecomCheckinSummaryIntervalMinutes: interval,
    },
    error: null,
  };
}

export function parseExternalForumFormValues(
  input: unknown,
  allowed: AdminFormAllowedValues = {},
): ParseResult<ExternalForumFormValues> {
  const record = asRecord(input);

  if (!record) {
    return { values: null, error: "提交数据格式无效。" };
  }

  const title = stringValue(record, "title");
  const organizer = stringValue(record, "organizer");
  const meetingTime = stringValue(record, "meetingTime");
  const location = stringValue(record, "location");
  const attendeesText = stringValue(record, "attendeesText");
  const hasSpeech = stringValue(record, "hasSpeech");
  const speechTopic = stringValue(record, "speechTopic");
  const speaker = stringValue(record, "speaker");
  const cost = stringValue(record, "cost");
  const costType = stringValue(record, "costType");
  const businessUnit = stringValue(record, "businessUnit");
  const sponsored = stringValue(record, "sponsored");
  const sponsorshipType = stringValue(record, "sponsorshipType");
  const followUp = stringValue(record, "followUp");
  const notes = stringValue(record, "notes");
  const purposes = stringArray(record.purposes);
  const outputs = stringArray(record.outputs);

  if (!title) return { values: null, error: "请填写会议主题。" };
  if (!organizer) return { values: null, error: "请填写主办单位。" };
  if (!isValidLocalDateTime(meetingTime)) {
    return { values: null, error: "请选择有效的会议时间。" };
  }
  if (!location) return { values: null, error: "请填写会议地点。" };
  if (!attendeesText) return { values: null, error: "请填写参会人。" };
  if (!businessUnit) return { values: null, error: "请填写所属部门。" };
  if (isUnknownOption(businessUnit, allowed.departments)) {
    return { values: null, error: "所属部门不在基础配置中。" };
  }
  if (isUnknownOption(costType, allowed.costTypes)) {
    return { values: null, error: "费用类型不在基础配置中。" };
  }
  if (hasSpeech !== "yes" && hasSpeech !== "no") {
    return { values: null, error: "请选择是否演讲。" };
  }
  if (hasSpeech === "yes" && (!speechTopic || !speaker)) {
    return { values: null, error: "演讲会议必须填写演讲题目和演讲人。" };
  }
  if (sponsored !== "yes" && sponsored !== "no") {
    return { values: null, error: "请选择是否赞助。" };
  }
  if (sponsored === "yes" && !sponsorshipType) {
    return { values: null, error: "请填写赞助形式。" };
  }
  if (cost && (!Number.isFinite(Number(cost)) || Number(cost) < 0)) {
    return { values: null, error: "费用必须为不小于 0 的数字。" };
  }
  if (!purposes || !outputs) {
    return { values: null, error: "参会目的或会议产出包含无效选项。" };
  }
  if (purposes.some((value) => isUnknownOption(value, allowed.attendancePurposes))) {
    return { values: null, error: "参会目的不在基础配置中。" };
  }
  if (outputs.some((value) => isUnknownOption(value, allowed.meetingOutputs))) {
    return { values: null, error: "会议产出不在基础配置中。" };
  }
  if (
    hasOversizedValue([
      [title, 200],
      [organizer, 200],
      [location, 300],
      [attendeesText, 1000],
      [speechTopic, 300],
      [speaker, 100],
      [costType, 100],
      [businessUnit, 100],
      [sponsorshipType, 300],
      [followUp, 2000],
      [notes, 2000],
    ])
  ) {
    return { values: null, error: "部分字段内容过长，请精简后重试。" };
  }

  return {
    values: {
      title,
      organizer,
      meetingTime,
      location,
      attendeesText,
      hasSpeech,
      speechTopic,
      speaker,
      cost,
      costType: costType as ExternalForumFormValues["costType"],
      businessUnit,
      sponsored,
      sponsorshipType,
      purposes,
      outputs,
      followUp,
      notes,
    },
    error: null,
  };
}

export function parseMarketingMeetingFormValues(
  input: unknown,
  allowed: AdminFormAllowedValues = {},
): ParseResult<MarketingMeetingFormValues> {
  const record = asRecord(input);

  if (!record) {
    return { values: null, error: "提交数据格式无效。" };
  }

  const title = stringValue(record, "title");
  const businessUnit = stringValue(record, "businessUnit");
  const attendeesText = stringValue(record, "attendeesText");
  const meetingTime = stringValue(record, "meetingTime");
  const locationType = stringValue(record, "locationType");
  const onlineUrl = stringValue(record, "onlineUrl");
  const offlineAddress = stringValue(record, "offlineAddress");
  const meetingType = stringValue(record, "meetingType");
  const conclusion = stringValue(record, "conclusion");
  const followUp = stringValue(record, "followUp");
  const notes = stringValue(record, "notes");

  if (!title) return { values: null, error: "请填写会议主题。" };
  if (!businessUnit) return { values: null, error: "请填写所属部门。" };
  if (isUnknownOption(businessUnit, allowed.departments)) {
    return { values: null, error: "所属部门不在基础配置中。" };
  }
  if (!attendeesText) return { values: null, error: "请填写参会人。" };
  if (!isValidLocalDateTime(meetingTime)) {
    return { values: null, error: "请选择有效的会议时间。" };
  }
  if (locationType !== "online" && locationType !== "offline") {
    return { values: null, error: "请选择有效的地点类型。" };
  }
  if (locationType === "online" && !onlineUrl) {
    return { values: null, error: "请填写线上会议链接。" };
  }
  if (locationType === "offline" && !offlineAddress) {
    return { values: null, error: "请填写线下会议地址。" };
  }
  if (isUnknownOption(meetingType, allowed.marketingMeetingTypes)) {
    return { values: null, error: "会议类型不在基础配置中。" };
  }
  if (
    hasOversizedValue([
      [title, 200],
      [businessUnit, 100],
      [attendeesText, 1000],
      [onlineUrl, 500],
      [offlineAddress, 300],
      [meetingType, 100],
      [conclusion, 2000],
      [followUp, 2000],
      [notes, 2000],
    ])
  ) {
    return { values: null, error: "部分字段内容过长，请精简后重试。" };
  }

  return {
    values: {
      title,
      businessUnit,
      attendeesText,
      meetingTime,
      locationType,
      onlineUrl,
      offlineAddress,
      meetingType: meetingType as MarketingMeetingFormValues["meetingType"],
      conclusion,
      followUp,
      notes,
    },
    error: null,
  };
}
