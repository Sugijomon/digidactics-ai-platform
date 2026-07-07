import {
  DashboardAccessPanel,
  DashboardShell,
  getDashboardAccess,
} from "@/components/dashboard-shell";
import { getRiskSummary } from "../_lib/dashboard-data";
import { RiskProfileClient } from "./risk-profile-client";

export default async function RiskProfileDashboardPage() {
  const access = await getDashboardAccess();

  if (access.kind !== "authorized") {
    return (
      <DashboardShell active="risicoprofiel">
        <DashboardAccessPanel access={access} />
      </DashboardShell>
    );
  }

  const summary = await getRiskSummary(access.roleState.orgId);

  return (
    <DashboardShell active="risicoprofiel">
      <RiskProfileClient summary={summary} />
    </DashboardShell>
  );
}
