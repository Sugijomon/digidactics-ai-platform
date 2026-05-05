import { getUserRole } from "@/lib/supabase/get-user-role";

export const dynamic = "force-dynamic";

export default async function DevAuthPage() {
  const { user, role, orgId, error } = await getUserRole();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Dev</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Supabase Auth Debug
        </h1>
      </header>

      <section className="grid gap-4 rounded-lg border border-zinc-200 p-6">
        <DebugRow label="Session" value={user ? "Authenticated" : "No user"} />
        <DebugRow label="User ID" value={user?.id ?? "Not available"} />
        <DebugRow label="Email" value={user?.email ?? "Not available"} />
        <DebugRow label="Role" value={role ?? "Not available"} />
        <DebugRow label="Org ID" value={orgId ?? "Not available"} />
        <DebugRow label="Error" value={error ?? "None"} />
      </section>
    </main>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      <dd className="font-mono text-sm text-zinc-950 sm:col-span-2">
        {value}
      </dd>
    </div>
  );
}
