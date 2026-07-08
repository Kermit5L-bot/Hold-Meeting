export function FilterBar() {
  return (
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-4">
      <label className="grid gap-1 text-sm font-medium text-ink">
        年度
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
          name="year"
          defaultValue="2026"
        >
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-ink">
        会议类型
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
          name="meetingType"
          defaultValue="all"
        >
          <option value="all">全部</option>
          <option value="outreach">外联会议</option>
          <option value="external_forum">外部会议&论坛</option>
          <option value="marketing_center">营销中心会议</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-ink">
        所属部门
        <input
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
          name="businessUnit"
          placeholder="输入部门"
          type="search"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-ink">
        区域
        <input
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
          name="region"
          placeholder="输入区域"
          type="search"
        />
      </label>
    </form>
  );
}
