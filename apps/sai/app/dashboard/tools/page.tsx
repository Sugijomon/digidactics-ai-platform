import {
  DashboardAccessPanel,
  DashboardShell,
  getDashboardAccess,
} from "@/components/dashboard-shell";
import { getInventoryMetrics, getToolInventory } from "../_lib/dashboard-data";
import { ToolInventoryClient } from "./tool-inventory-client";

export default async function ToolInventoryDashboardPage() {
  const access = await getDashboardAccess();

  if (access.kind !== "authorized") {
    return (
      <DashboardShell active="tools">
        <DashboardAccessPanel access={access} />
      </DashboardShell>
    );
  }

  const inventory = await getToolInventory(access.roleState.orgId);
  const metrics = getInventoryMetrics(inventory);

  return (
    <DashboardShell active="tools">
      <ToolInventoryClient inventory={inventory} metrics={metrics} />
    </DashboardShell>
  );
}
