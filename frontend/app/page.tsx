"use client";

import { useEffect, useState, useCallback } from "react";

type Tenant = {
  id: string;
  name: string;
  apiKey: string;
  maxRequests: number;
  windowSeconds: number;
};

type TenantWithUsage = {
  tenant: Tenant;
  currentUsage: number;
};

export default function Dashboard() {
  const [tenants, setTenants] = useState<TenantWithUsage[]>([]);
  const [name, setName] = useState("");
  const [maxRequests, setMaxRequests] = useState(100);
  const [windowSeconds, setWindowSeconds] = useState(60);
  const [creating, setCreating] = useState(false);
  const [flash, setFlash] = useState<Record<string, "ok" | "limited">>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/backend/admin/tenants");
      if (res.ok) setTenants(await res.json());
    } catch {
      /* backend not up yet */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await fetch("/backend/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, maxRequests, windowSeconds }),
      });
      setName("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function deleteTenant(id: string) {
    await fetch(`/backend/admin/tenants/${id}`, { method: "DELETE" });
    await load();
  }

  async function sendTest(apiKey: string) {
    const res = await fetch("/backend/api/check", {
      headers: { "X-API-Key": apiKey },
    });
    setFlash((f) => ({ ...f, [apiKey]: res.status === 200 ? "ok" : "limited" }));
    setTimeout(() => setFlash((f) => { const n = { ...f }; delete n[apiKey]; return n; }), 700);
    await load();
  }

  return (
    <main className="min-h-screen bg-[#05060a] text-slate-100 relative overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[400px] w-[400px] rounded-full bg-fuchsia-600/20 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 via-sky-200 to-fuchsia-300 bg-clip-text text-transparent">
            QuotaForge
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Distributed rate limiting · live tenant usage
          </p>
        </header>

        {/* create form */}
        <form
          onSubmit={createTenant}
          className="mb-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-2xl"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_auto_auto]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tenant name"
              className="rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition"
            />
            <input
              type="number"
              value={maxRequests}
              onChange={(e) => setMaxRequests(+e.target.value)}
              className="w-28 rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-cyan-400/60"
              title="Max requests"
            />
            <input
              type="number"
              value={windowSeconds}
              onChange={(e) => setWindowSeconds(+e.target.value)}
              className="w-28 rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-cyan-400/60"
              title="Window (seconds)"
            />
            <button
              disabled={creating}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            limit · window (s) — e.g. 100 requests per 60 seconds
          </p>
        </form>

        {/* tenant cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {tenants.map(({ tenant, currentUsage }) => {
            const pct = Math.min(100, (currentUsage / tenant.maxRequests) * 100);
            const near = pct >= 80;
            const f = flash[tenant.apiKey];
            return (
              <div
                key={tenant.id}
                className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-xl hover:border-cyan-400/30 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{tenant.name}</h3>
                    <code className="text-[11px] text-slate-500 break-all">{tenant.apiKey}</code>
                  </div>
                  <button
                    onClick={() => deleteTenant(tenant.id)}
                    className="text-slate-500 hover:text-rose-400 transition text-sm"
                    title="Delete tenant"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">
                      {currentUsage} / {tenant.maxRequests}
                    </span>
                    <span className={near ? "text-rose-300" : "text-cyan-300"}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-black/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        near
                          ? "bg-gradient-to-r from-rose-500 to-fuchsia-500"
                          : "bg-gradient-to-r from-cyan-400 to-sky-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    per {tenant.windowSeconds}s window
                  </p>
                </div>

                <button
                  onClick={() => sendTest(tenant.apiKey)}
                  className={`mt-4 w-full rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[0.98] ${
                    f === "ok"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                      : f === "limited"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-400/40"
                      : "bg-white/5 border border-white/10 hover:border-cyan-400/40 text-slate-200"
                  }`}
                >
                  {f === "ok" ? "✓ Allowed" : f === "limited" ? "✕ Rate limited" : "Send test request"}
                </button>
              </div>
            );
          })}
        </div>

        {tenants.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-500">
            No tenants yet — create one above.
          </div>
        )}
      </div>
    </main>
  );
}