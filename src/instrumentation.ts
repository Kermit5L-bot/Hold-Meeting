export async function register() {
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  ) {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWecomCheckinSummaryJob } = await import(
      "@/lib/wecom-checkin-summary-job"
    );
    startWecomCheckinSummaryJob();
  }
}
