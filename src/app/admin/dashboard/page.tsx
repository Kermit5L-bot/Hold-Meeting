import { redirect } from "next/navigation";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const { accountId } = await searchParams;
  redirect(accountId ? `/admin?accountId=${encodeURIComponent(accountId)}` : "/admin");
}
