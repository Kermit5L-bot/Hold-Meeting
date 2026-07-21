"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Search } from "lucide-react";
import { MobileInput, MobileTextarea } from "@/components/ui/mobile-field";
import { normalizePhoneDigits, phoneLengthMessage } from "@/lib/phone";
import type { SelectOption } from "@/lib/settings-options";
import type { RegistrationFormValues } from "@/lib/types";

type LookupState =
  | { status: "idle" }
  | { status: "not_found"; phone: string }
  | {
      status: "registered";
      phone: string;
      registration: {
        name: string;
        organizationName: string;
        phone: string;
      };
    }
  | {
      status: "checked_in";
      registration: {
        name: string;
        phone: string;
        checkinAt?: string;
      };
    };

const emptyWalkInForm: Omit<RegistrationFormValues, "meetingId"> = {
  name: "",
  organizationType: "",
  otherOrganizationType: "",
  organizationName: "",
  position: "",
  phone: "",
  meal: "",
  notes: "",
};

export function CheckinFlow({
  meetingId,
  organizationTypeOptions: settingOrganizationTypeOptions,
}: {
  meetingId: string;
  organizationTypeOptions: SelectOption[];
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>({
    status: "idle",
  });
  const [walkInValues, setWalkInValues] = useState(emptyWalkInForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const showOtherOrganization = walkInValues.organizationType === "other";

  function updateLookupPhone(value: string) {
    const normalized = normalizePhoneDigits(value).slice(0, 11);
    setPhone(normalized);
  }

  function updateWalkIn<K extends keyof typeof emptyWalkInForm>(
    key: K,
    value: (typeof emptyWalkInForm)[K],
  ) {
    setWalkInValues((current) => ({ ...current, [key]: value }));
  }

  function updateWalkInPhone(value: string) {
    updateWalkIn("phone", normalizePhoneDigits(value).slice(0, 11));
  }

  async function lookupRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (normalizePhoneDigits(phone).length !== 11) {
      setError(phoneLengthMessage());
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/checkins/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meetingId, phone }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            status: "not_found";
          }
        | {
            status: "registered" | "checked_in";
            registration: {
              name: string;
              organizationName?: string;
              phone: string;
              checkinAt?: string;
            };
          }
        | { message?: string }
        | null;

      if (!response.ok || !data) {
        setError(
          data && "message" in data && data.message
            ? data.message
            : "查询失败，请稍后重试。",
        );
        return;
      }

      if ("status" in data && data.status === "not_found") {
        setLookupState({ status: "not_found", phone });
        setWalkInValues((current) => ({ ...current, phone }));
        return;
      }

      if ("status" in data && data.status === "checked_in") {
        setLookupState({
          status: "checked_in",
          registration: {
            name: data.registration.name,
            phone: data.registration.phone,
            checkinAt: data.registration.checkinAt,
          },
        });
        return;
      }

      if ("status" in data && data.status === "registered") {
        setLookupState({
          status: "registered",
          phone,
          registration: {
            name: data.registration.name,
            organizationName: data.registration.organizationName ?? "",
            phone: data.registration.phone,
          },
        });
      }
    } catch {
      setError("网络连接失败，请检查网络后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmCheckin() {
    setError("");

    if (normalizePhoneDigits(phone).length !== 11) {
      setError(phoneLengthMessage());
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/checkins/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meetingId, phone }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            message?: string;
            registration?: {
              name: string;
              phone: string;
              checkinAt?: string;
            };
            successToken?: string;
          }
        | null;

      if (response.status === 409 && data?.registration) {
        setLookupState({
          status: "checked_in",
          registration: data.registration,
        });
        return;
      }

      if (!response.ok || !data?.registration || !data.successToken) {
        setError(data?.message ?? "签到失败，请重新扫码或联系现场工作人员。");
        return;
      }

      router.push(`/m/success?token=${encodeURIComponent(data.successToken)}`);
    } catch {
      setError("网络连接失败，请检查网络后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitWalkIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const submitPhone = walkInValues.phone || phone;

    if (normalizePhoneDigits(submitPhone).length !== 11) {
      setError(phoneLengthMessage());
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/checkins/walk-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingId,
          ...walkInValues,
          phone: submitPhone,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { message?: string; name?: string; phone?: string; successToken?: string }
        | null;

      if (!response.ok) {
        setError(data?.message ?? "补报名并签到失败，请检查信息后重试。");
        return;
      }

      if (!data?.successToken) {
        setError("报名和签到已完成，但确认页面暂时不可用，请联系现场工作人员。");
        return;
      }

      router.push(`/m/success?token=${encodeURIComponent(data.successToken)}`);
    } catch {
      setError("网络连接失败，请检查网络后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <form className="grid gap-4" onSubmit={lookupRegistration}>
        <MobileInput
          autoComplete="tel"
          inputMode="numeric"
          label="手机号"
          maxLength={11}
          name="phone"
          onChange={(event) => updateLookupPhone(event.target.value)}
          pattern="[0-9]{11}"
          placeholder="请输入 11 位报名手机号"
          required
          title="手机号需填写 11 位数字"
          type="tel"
          value={phone}
        />
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-brand px-4 text-base font-medium text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={submitting}
          type="submit"
        >
          <Search aria-hidden="true" className="h-4 w-4" />
          {submitting ? "查询中…" : "查询报名信息"}
        </button>
      </form>

      {lookupState.status === "registered" ? (
        <section className="rounded-lg border border-success/20 bg-success/5 p-4">
          <h2 className="text-base font-semibold text-ink">请确认签到信息</h2>
          <dl className="mt-3 grid gap-2 text-sm text-slate-700">
            <div className="flex justify-between gap-4">
              <dt>姓名</dt>
              <dd className="font-medium text-ink">
                {lookupState.registration.name}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>单位</dt>
              <dd className="font-medium text-ink">
                {lookupState.registration.organizationName}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>手机号</dt>
              <dd className="font-medium text-ink">
                {lookupState.registration.phone}
              </dd>
            </div>
          </dl>
          <button
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-success px-4 text-base font-medium text-white transition-colors duration-150 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={submitting}
            onClick={confirmCheckin}
            type="button"
          >
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            {submitting ? "签到中…" : "确认签到"}
          </button>
        </section>
      ) : null}

      {lookupState.status === "checked_in" ? (
        <section className="rounded-lg border border-success/20 bg-success/5 p-4 text-sm leading-6 text-slate-700">
          <h2 className="text-base font-semibold text-ink">
            您已完成签到，无需重复签到
          </h2>
          <p className="mt-2">姓名：{lookupState.registration.name}</p>
          <p>手机号：{lookupState.registration.phone}</p>
        </section>
      ) : null}

      {lookupState.status === "not_found" ? (
        <section className="rounded-lg border border-warning/20 bg-warning/10 p-4">
          <h2 className="text-base font-semibold text-ink">未查询到报名信息</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            请先补充报名信息，提交后系统会自动完成签到。
          </p>
          <form className="mt-4 grid gap-4" onSubmit={submitWalkIn}>
            <MobileInput
              autoComplete="name"
              label="姓名"
              name="name"
              onChange={(event) => updateWalkIn("name", event.target.value)}
              placeholder="请输入姓名"
              required
              type="text"
              value={walkInValues.name}
            />
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              单位类型
              <select
                className="h-11 rounded-md border border-slate-200 bg-white px-3 text-base text-ink"
                name="organizationType"
                onChange={(event) =>
                  updateWalkIn(
                    "organizationType",
                    event.target.value as RegistrationFormValues["organizationType"],
                  )
                }
                required
                value={walkInValues.organizationType}
              >
                <option value="">请选择单位类型</option>
                {settingOrganizationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {showOtherOrganization ? (
              <MobileInput
                autoComplete="off"
                label="其他单位类型"
                name="otherOrganizationType"
                onChange={(event) =>
                  updateWalkIn("otherOrganizationType", event.target.value)
                }
                placeholder="请输入单位类型"
                required
                type="text"
                value={walkInValues.otherOrganizationType}
              />
            ) : null}
            <MobileInput
              autoComplete="organization"
              label="单位名称"
              name="organizationName"
              onChange={(event) =>
                updateWalkIn("organizationName", event.target.value)
              }
              placeholder="请输入单位名称"
              required
              type="text"
              value={walkInValues.organizationName}
            />
            <MobileInput
              autoComplete="organization-title"
              label="职位"
              name="position"
              onChange={(event) => updateWalkIn("position", event.target.value)}
              placeholder="选填"
              type="text"
              value={walkInValues.position}
            />
            <MobileInput
              autoComplete="tel"
              inputMode="numeric"
              label="手机号"
              maxLength={11}
              name="phone"
              onChange={(event) => updateWalkInPhone(event.target.value)}
              pattern="[0-9]{11}"
              placeholder="请输入 11 位手机号"
              required
              title="手机号需填写 11 位数字"
              type="tel"
              value={walkInValues.phone}
            />
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium text-ink">是否用餐</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink">
                  <input
                    checked={walkInValues.meal === "yes"}
                    name="meal"
                    onChange={() => updateWalkIn("meal", "yes")}
                    required
                    type="radio"
                    value="yes"
                  />
                  是
                </label>
                <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink">
                  <input
                    checked={walkInValues.meal === "no"}
                    name="meal"
                    onChange={() => updateWalkIn("meal", "no")}
                    required
                    type="radio"
                    value="no"
                  />
                  否
                </label>
              </div>
            </fieldset>
            <MobileTextarea
              label="备注"
              name="notes"
              onChange={(event) => updateWalkIn("notes", event.target.value)}
              placeholder="如有特殊需求可在此填写"
              value={walkInValues.notes}
            />
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-success px-4 text-base font-medium text-white transition-colors duration-150 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={submitting}
              type="submit"
            >
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              {submitting ? "提交中…" : "提交并签到"}
            </button>
          </form>
        </section>
      ) : null}

      {error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
