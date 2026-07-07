import {
  DashboardAccessPanel,
  DashboardShell,
  getDashboardAccess,
} from "@/components/dashboard-shell";
import { ActivationDashboardClient } from "./activation-dashboard-client";
import {
  getActivationMetrics,
  getActivationOrgContext,
  getProgressSummary,
} from "../_lib/dashboard-data";

export default async function ActivationDashboardPage() {
  const access = await getDashboardAccess();

  if (access.kind !== "authorized") {
    return (
      <DashboardShell active="activatie">
        <DashboardAccessPanel access={access} />
      </DashboardShell>
    );
  }

  const [metrics, progress, orgContext] = await Promise.all([
    getActivationMetrics(access.roleState.orgId),
    getProgressSummary(access.roleState.orgId),
    getActivationOrgContext(
      access.roleState.orgId,
      access.roleState.user.email,
    ),
  ]);

  return (
    <DashboardShell active="activatie">
      <ActivationDashboardClient
        metrics={metrics}
        orgContext={orgContext}
        progress={progress}
      />
    </DashboardShell>
  );
}
