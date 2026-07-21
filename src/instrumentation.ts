export async function register() {
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  ) {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [
      { startWecomCheckinSummaryJob },
      { startWecomNotificationJob },
      { startOutreachCoverCleanupJob },
      { persistOutreachOwnershipMigration },
      { persistExternalForumOwnershipMigration },
      { persistMarketingOwnershipMigration },
    ] = await Promise.all([
        import("@/lib/wecom-checkin-summary-job"),
        import("@/lib/wecom-notification-job"),
        import("@/lib/outreach-cover-cleanup-job"),
        import("@/lib/outreach-meetings-store"),
        import("@/lib/external-forums-store"),
        import("@/lib/marketing-meetings-store"),
      ]);
    persistOutreachOwnershipMigration();
    persistExternalForumOwnershipMigration();
    persistMarketingOwnershipMigration();
    startWecomCheckinSummaryJob();
    startWecomNotificationJob();
    startOutreachCoverCleanupJob();
  }
}
