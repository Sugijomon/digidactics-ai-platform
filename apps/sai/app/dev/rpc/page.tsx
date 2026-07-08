import { notFound } from "next/navigation";
import { areDevRoutesEnabled } from "@/lib/dev-routes";
import DevRpcClient from "./dev-rpc-client";

export const dynamic = "force-dynamic";

export default function DevRpcPage() {
  if (!areDevRoutesEnabled()) {
    notFound();
  }

  return <DevRpcClient />;
}
