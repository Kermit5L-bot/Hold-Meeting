export type MeetingType =
  | "outreach"
  | "external_forum"
  | "marketing_center";

export type MeetingStatus = "draft" | "published" | "ended" | "archived";

export type LocationType = "online" | "offline";

export interface MeetingBase {
  id: string;
  title: string;
  type: MeetingType;
  startTime: string;
  endTime?: string;
  locationType: LocationType;
  location: string;
  region?: string;
  businessUnit?: string;
  owner?: string;
  status: MeetingStatus;
  notes?: string;
  importKey?: string;
  importedAt?: string;
  importBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachMeeting extends MeetingBase {
  type: "outreach";
  registrationEnabled: boolean;
  checkinEnabled: boolean;
  mealEnabled: boolean;
  coverImageUrl?: string;
  enableWecomNotify: boolean;
  wecomWebhook?: string;
  wecomGroupName?: string;
  enableWecomCheckinSummaryNotify: boolean;
  wecomCheckinSummaryIntervalMinutes: 10 | 15 | 30;
  registrationCount: number;
  checkinCount: number;
  walkInCount: number;
}

export interface ExternalForumMeeting extends MeetingBase {
  type: "external_forum";
  organizer: string;
  attendees: string[];
  hasSpeech: boolean;
  speaker?: string;
  speechTopic?: string;
  cost: number;
  sponsored: boolean;
}

export interface MarketingCenterMeeting extends MeetingBase {
  type: "marketing_center";
  attendees: string[];
  internalMeetingType: string;
  conclusion?: string;
}

export type Meeting =
  | OutreachMeeting
  | ExternalForumMeeting
  | MarketingCenterMeeting;

export interface DashboardMetric {
  label: string;
  value: string;
  hint: string;
  tone: "brand" | "success" | "warning" | "neutral";
}

export interface MeetingFormValues {
  title: string;
  type: MeetingType;
  startTime: string;
  endTime: string;
  locationType: LocationType;
  location: string;
  region: string;
  businessUnit: string;
  owner: string;
  status: MeetingStatus;
  notes: string;
  coverImageUrl: string;
  enableWecomNotify: boolean;
  wecomWebhook: string;
  wecomGroupName: string;
  enableWecomCheckinSummaryNotify: boolean;
  wecomCheckinSummaryIntervalMinutes: 10 | 15 | 30;
}

export type OrganizationType =
  | "government"
  | "college"
  | "association"
  | "third_party_operation"
  | "third_party_testing"
  | "vendor"
  | "company"
  | "other";

export type MealPreference = "yes" | "no";

export type RegistrationStatus = "registered" | "cancelled";

export type RegistrationSource =
  | "pre_meeting"
  | "walk_in"
  | "admin_entry";

export type CheckinStatus = "not_checked_in" | "checked_in";

export type CheckinMethod = "wechat_scan" | "admin_manual";

export type WecomNotifyStatus = "not_sent" | "success" | "failed";

export interface Registration {
  id: string;
  meetingId: string;
  status: RegistrationStatus;
  source: RegistrationSource;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
  checkinStatus: CheckinStatus;
  checkinAt?: string;
  checkinMethod?: CheckinMethod;
  isWalkIn: boolean;
  name: string;
  organizationType: OrganizationType;
  otherOrganizationType?: string;
  organizationName: string;
  position?: string;
  phone: string;
  meal: MealPreference;
  notes?: string;
  importKey?: string;
  importedAt?: string;
  importBatchId?: string;
  wecomNotifyStatus?: WecomNotifyStatus;
  wecomNotifyError?: string;
}

export interface RegistrationFormValues {
  meetingId: string;
  name: string;
  organizationType: OrganizationType | "";
  otherOrganizationType: string;
  organizationName: string;
  position: string;
  phone: string;
  meal: MealPreference | "";
  notes: string;
}

export type CostType =
  | "registration_fee"
  | "sponsorship_fee"
  | "booth_fee"
  | "conference_fee"
  | "other";

export type AttendancePurpose =
  | "brand_exposure"
  | "customer_maintenance"
  | "industry_exchange"
  | "business_development"
  | "learning_research"
  | "other";

export type MeetingOutput =
  | "press_release"
  | "video"
  | "photo"
  | "minutes"
  | "customer_leads"
  | "other";

export interface ExternalForumRecord {
  id: string;
  title: string;
  organizer: string;
  meetingTime: string;
  location: string;
  attendees: string[];
  hasSpeech: boolean;
  speechTopic?: string;
  speaker?: string;
  cost?: number;
  costType?: CostType;
  businessUnit: string;
  sponsored: boolean;
  sponsorshipType?: string;
  purposes: AttendancePurpose[];
  outputs: MeetingOutput[];
  followUp?: string;
  notes?: string;
  importKey?: string;
  importedAt?: string;
  importBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalForumFormValues {
  title: string;
  organizer: string;
  meetingTime: string;
  location: string;
  attendeesText: string;
  hasSpeech: "yes" | "no";
  speechTopic: string;
  speaker: string;
  cost: string;
  costType: CostType | "";
  businessUnit: string;
  sponsored: "yes" | "no";
  sponsorshipType: string;
  purposes: AttendancePurpose[];
  outputs: MeetingOutput[];
  followUp: string;
  notes: string;
}

export type InternalMeetingType =
  | "regular"
  | "special"
  | "training"
  | "review"
  | "coordination"
  | "other";

export interface MarketingMeetingRecord {
  id: string;
  title: string;
  businessUnit: string;
  attendees: string[];
  meetingTime: string;
  locationType: LocationType;
  onlineUrl?: string;
  offlineAddress?: string;
  meetingType?: InternalMeetingType;
  conclusion?: string;
  followUp?: string;
  notes?: string;
  importKey?: string;
  importedAt?: string;
  importBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingMeetingFormValues {
  title: string;
  businessUnit: string;
  attendeesText: string;
  meetingTime: string;
  locationType: LocationType;
  onlineUrl: string;
  offlineAddress: string;
  meetingType: InternalMeetingType | "";
  conclusion: string;
  followUp: string;
  notes: string;
}

export type SettingsCategory =
  | "department"
  | "region"
  | "organizationType"
  | "costType"
  | "marketingMeetingType"
  | "attendancePurpose"
  | "meetingOutput";

export interface SettingsOption {
  id: string;
  category: SettingsCategory;
  value: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
  system?: boolean;
  createdAt: string;
  updatedAt: string;
}
