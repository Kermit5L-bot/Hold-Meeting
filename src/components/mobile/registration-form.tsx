"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { MobileInput, MobileTextarea } from "@/components/ui/mobile-field";
import { normalizePhoneDigits, phoneLengthMessage } from "@/lib/phone";
import type { SelectOption } from "@/lib/settings-options";
import type { RegistrationFormValues } from "@/lib/types";

const initialValues: Omit<RegistrationFormValues, "meetingId"> = {
  name: "",
  organizationType: "",
  otherOrganizationType: "",
  organizationName: "",
  position: "",
  phone: "",
  meal: "",
  notes: "",
};

export function RegistrationForm({
  meetingId,
  organizationTypeOptions: settingOrganizationTypeOptions,
}: {
  meetingId: string;
  organizationTypeOptions: SelectOption[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const showOtherOrganization = values.organizationType === "other";

  function update<K extends keyof typeof initialValues>(
    key: K,
    value: (typeof initialValues)[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function updatePhone(value: string) {
    update("phone", normalizePhoneDigits(value).slice(0, 11));
  }

  async function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (normalizePhoneDigits(values.phone).length !== 11) {
      setError(phoneLengthMessage());
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingId,
          ...values,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { message?: string; successToken?: string }
        | null;

      if (response.status === 409) {
        setError(data?.message ?? "您已提交过报名信息");
        return;
      }

      if (!response.ok) {
        setError(data?.message ?? "报名提交失败，请检查后重试。");
        return;
      }

      if (!data?.successToken) {
        setError("报名已保存，但确认页面暂时不可用，请联系现场工作人员。");
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
    <form className="grid gap-4" onSubmit={submitRegistration}>
      <MobileInput
        autoComplete="name"
        label="姓名"
        name="name"
        onChange={(event) => update("name", event.target.value)}
        placeholder="请输入姓名"
        required
        type="text"
        value={values.name}
      />
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        单位类型
        <select
          className="h-11 rounded-md border border-slate-200 bg-white px-3 text-base text-ink"
          name="organizationType"
          onChange={(event) =>
            update(
              "organizationType",
              event.target.value as RegistrationFormValues["organizationType"],
            )
          }
          required
          value={values.organizationType}
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
          onChange={(event) => update("otherOrganizationType", event.target.value)}
          placeholder="请输入单位类型"
          required
          type="text"
          value={values.otherOrganizationType}
        />
      ) : null}
      <MobileInput
        autoComplete="organization"
        label="单位名称"
        name="organizationName"
        onChange={(event) => update("organizationName", event.target.value)}
        placeholder="请输入单位名称"
        required
        type="text"
        value={values.organizationName}
      />
      <MobileInput
        autoComplete="organization-title"
        label="职位"
        name="position"
        onChange={(event) => update("position", event.target.value)}
        placeholder="选填"
        type="text"
        value={values.position}
      />
      <MobileInput
        autoComplete="tel"
        inputMode="numeric"
        label="手机号"
        maxLength={11}
        name="phone"
        onChange={(event) => updatePhone(event.target.value)}
        pattern="[0-9]{11}"
        placeholder="请输入 11 位手机号"
        required
        title="手机号需填写 11 位数字"
        type="tel"
        value={values.phone}
      />
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-ink">是否用餐</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-ink">
            <input
              checked={values.meal === "yes"}
              name="meal"
              onChange={() => update("meal", "yes")}
              required
              type="radio"
              value="yes"
            />
            是
          </label>
          <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-ink">
            <input
              checked={values.meal === "no"}
              name="meal"
              onChange={() => update("meal", "no")}
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
        onChange={(event) => update("notes", event.target.value)}
        placeholder="如有特殊需求可在此填写"
        value={values.notes}
      />
      {error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <button
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-brand px-4 text-base font-medium text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={submitting}
        type="submit"
      >
        <Send aria-hidden="true" className="h-4 w-4" />
        {submitting ? "提交中…" : "提交报名"}
      </button>
    </form>
  );
}
