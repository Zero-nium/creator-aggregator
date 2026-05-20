"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ═══════════════════════════════════════════════════════════════
   TYPES — New Backend Schema (v1.1.0)
   ═══════════════════════════════════════════════════════════════ */

interface SignalSource {
  name: string;
  url?: string;
  date_accessed: string;
  source_type: string;
}

interface CreatorIntel {
  region: string;
  signal_type: string;
  severity: "critical" | "high" | "medium" | "low" | "observational";
  headline: string;
  what_changed: string;
  creator_risk: string;
  creator_action: string;
  content_format_at_risk: string[];
  deadline?: string;
  sources: SignalSource[];
  cross_references: string[];
}

interface ConsolidationSignal {
  pattern: string;
  regions_affected: string[];
  description: string;
  product_opportunity: string;
  urgency: string;
  first_detected: string;
  event_count: number;
  trend_direction: string;
}

interface ArbitrageSignal {
  description: string;
  opportunity: string;
  data_gap?: string;
  regions_affected: string[];
}

interface MarketIntel {
  consolidation_signals: ConsolidationSignal[];
  arbitrage_signals: ArbitrageSignal[];
  emerging_themes: any[];
}

interface AgentSignal {
  signal_id: string;
  date: string;
  swarm_id: string;
  cohort: string;
  region_focus: string;
  creator_intelligence: CreatorIntel[];
  market_intelligence: MarketIntel;
  narrative: string;
  submitted_at: string;
}

interface AlertItem {
  alert_id: string;
  severity: string;
  region: string;
  headline: string;
  action: string;
  deadline?: string;
  content_formats: string[];
  sources: string[];
}

interface DeadlineItem {
  deadline_id: string;
  date: string;
  region: string;
  headline: string;
  action_required: string;
  days_remaining: number;
  severity: string;
}

interface OpportunityItem {
  opportunity_id: string;
  pattern_name: string;
  regions_affected: string[];
  description: string;
  product_opportunity: string;
  urgency: string;
  data_gaps: string[];
  first_detected: string;
  trend_direction: string;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const API_BASE = "https://agent-dashboard-api-windblown-fog-6023.fly.dev/api/v1";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#3b82f6",
  observational: "#64748b",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-red-500/10 text-red-300 border-red-500/30",
  high: "bg-orange-500/10 text-orange-300 border-orange-500/30",
  medium: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  low: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  observational: "bg-slate-700 text-slate-300 border-slate-600",
};

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#06b6d4"];

const REGION_EMOJI: Record<string, string> = {
  Australia: "🇦🇺",
  Japan: "🇯🇵",
  Indonesia: "🇮🇩",
  "South Korea": "🇰🇷",
  India: "🇮🇳",
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

type ViewMode = "creator" | "builder";
type CreatorTab = "alerts" | "deadlines" | "signals";
type BuilderTab = "opportunities" | "patterns" | "signals";

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("creator");
  const [creatorTab, setCreatorTab] = useState<CreatorTab>("alerts");
  const [builderTab, setBuilderTab] = useState<BuilderTab>("opportunities");

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [signals, setSignals] = useState<AgentSignal[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string>("");

  /* ─── Fetch all data ─── */
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);

        const [alertsRes, deadlinesRes, oppRes, sigRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/creator/alerts`),
          fetch(`${API_BASE}/creator/deadlines`),
          fetch(`${API_BASE}/market/opportunities`),
          fetch(`${API_BASE}/archive/latest`),
          fetch(`${API_BASE}/stats`),
        ]);

        if (!cancelled) {
          if (alertsRes.ok) setAlerts(await alertsRes.json());
          if (deadlinesRes.ok) setDeadlines(await deadlinesRes.json());
          if (oppRes.ok) setOpportunities(await oppRes.json());
          if (sigRes.ok) {
            const sigData = await sigRes.json();
            setSignals(sigData.signals || []);
          }
          if (statsRes.ok) setStats(await statsRes.json());
          setLastFetch(new Date().toLocaleTimeString());
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  /* ─── Derived data ─── */
  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, observational: 0 };
    alerts.forEach((a) => { counts[a.severity] = (counts[a.severity] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [alerts]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach((a) => { counts[a.region] = (counts[a.region] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [alerts]);

  const urgentDeadlines = useMemo(() => {
    return deadlines.filter((d) => d.days_remaining <= 30).sort((a, b) => a.days_remaining - b.days_remaining);
  }, [deadlines]);

  const criticalAlerts = useMemo(() => alerts.filter((a) => a.severity === "critical" || a.severity === "high"), [alerts]);

  /* ─── Render ─── */
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* ═══════ HEADER ═══════ */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Creator Aggregator</h1>
              <p className="mt-1 text-slate-400">Agent-Powered Trend Intelligence · Live Backend</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-1 flex">
                <button
                  onClick={() => setViewMode("creator")}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === "creator" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🎨 Creator
                </button>
                <button
                  onClick={() => setViewMode("builder")}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === "builder" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🏗️ Builder
                </button>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div className="text-slate-300">{stats?.total_signals ?? 0} signals</div>
                <div>Updated {lastFetch}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
            Loading intelligence…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {/* ═══════ CREATOR VIEW ═══════ */}
        {viewMode === "creator" && !loading && (
          <div className="space-y-6">
            {/* Critical banner */}
            {criticalAlerts.length > 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-center gap-2 text-red-300 font-semibold">
                  <span>⚠️</span>
                  <span>{criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? "s" : ""} Requiring Action</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {criticalAlerts.slice(0, 3).map((a) => (
                    <span key={a.alert_id} className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-200">
                      {REGION_EMOJI[a.region] || "🌏"} {a.headline.slice(0, 50)}…
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Alerts" value={alerts.length} color="#6366f1" />
              <StatCard label="Critical/High" value={criticalAlerts.length} color="#ef4444" />
              <StatCard label="Upcoming Deadlines" value={urgentDeadlines.length} color="#f59e0b" />
              <StatCard label="Regions Covered" value={stats?.regions_covered ?? 0} color="#10b981" />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="mb-4 text-sm font-semibold text-white">Alerts by Severity</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={severityCounts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {severityCounts.map((entry, i) => (
                          <Cell key={i} fill={SEVERITY_COLORS[entry.name] || CHART_COLORS[i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="mb-4 text-sm font-semibold text-white">Alerts by Region</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={regionCounts} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name }) => name}>
                        {regionCounts.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Creator tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
              {(["alerts", "deadlines", "signals"] as CreatorTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCreatorTab(tab)}
                  className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    creatorTab === tab ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab}
                  {tab === "alerts" && <span className="ml-1 text-xs text-slate-500">({alerts.length})</span>}
                  {tab === "deadlines" && <span className="ml-1 text-xs text-slate-500">({deadlines.length})</span>}
                  {tab === "signals" && <span className="ml-1 text-xs text-slate-500">({signals.length})</span>}
                </button>
              ))}
            </div>

            {/* Alerts tab */}
            {creatorTab === "alerts" && (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.alert_id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="text-2xl">{REGION_EMOJI[alert.region] || "🌏"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${SEVERITY_BG[alert.severity] || SEVERITY_BG.observational}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-500">{alert.region}</span>
                        </div>
                        <h3 className="mt-2 text-base font-semibold text-white">{alert.headline}</h3>
                        <p className="mt-1 text-sm text-slate-400">{alert.action}</p>
                        {alert.deadline && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                            <span>⏰</span> Deadline: {alert.deadline}
                          </div>
                        )}
                        {alert.content_formats.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {alert.content_formats.map((f) => (
                              <span key={f} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{f.replace(/_/g, " ")}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      {alert.sources.map((s) => (
                        <span key={s} className="rounded bg-slate-800 px-1.5 py-0.5">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && <EmptyState message="No alerts available." />}
              </div>
            )}

            {/* Deadlines tab */}
            {creatorTab === "deadlines" && (
              <div className="space-y-3">
                {deadlines.map((d) => (
                  <div key={d.deadline_id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{REGION_EMOJI[d.region] || "🌏"}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${SEVERITY_BG[d.severity] || SEVERITY_BG.medium}`}>
                              {d.severity.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-500">{d.region}</span>
                          </div>
                          <h3 className="mt-1 text-base font-semibold text-white">{d.headline}</h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${d.days_remaining <= 7 ? "text-red-400" : d.days_remaining <= 30 ? "text-amber-400" : "text-emerald-400"}`}>
                          {d.days_remaining}
                        </div>
                        <div className="text-xs text-slate-500">days left</div>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-slate-800/50 p-3 text-sm text-slate-300">
                      <span className="font-medium text-white">Action:</span> {d.action_required}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">Due: {d.date}</div>
                  </div>
                ))}
                {deadlines.length === 0 && <EmptyState message="No upcoming deadlines." />}
              </div>
            )}

            {/* Signals tab (raw) */}
            {creatorTab === "signals" && (
              <div className="space-y-3">
                {signals.map((sig) => (
                  <div key={sig.signal_id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                        {sig.cohort}
                      </span>
                      <span className="text-xs text-slate-500">{sig.date} · {sig.region_focus}</span>
                      <span className="ml-auto text-xs text-slate-600 font-mono">{sig.signal_id}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {sig.creator_intelligence.map((intel, i) => (
                        <div key={i} className="rounded-lg bg-slate-800/30 p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{REGION_EMOJI[intel.region] || "🌏"}</span>
                            <span className="font-medium text-white">{intel.region}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium border ${SEVERITY_BG[intel.severity]}`}>
                              {intel.severity}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-slate-300">{intel.headline}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {signals.length === 0 && <EmptyState message="No signals in archive." />}
              </div>
            )}
          </div>
        )}

        {/* ═══════ BUILDER VIEW ═══════ */}
        {viewMode === "builder" && !loading && (
          <div className="space-y-6">
            {/* Opportunity stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Opportunities" value={opportunities.length} color="#10b981" />
              <StatCard label="Consolidation Patterns" value={opportunities.filter((o) => o.opportunity_id.startsWith("opp_")).length} color="#6366f1" />
              <StatCard label="Arbitrage Signals" value={opportunities.filter((o) => o.opportunity_id.startsWith("arb_")).length} color="#f59e0b" />
              <StatCard label="Markets Affected" value={new Set(opportunities.flatMap((o) => o.regions_affected)).size} color="#ec4899" />
            </div>

            {/* Builder tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
              {(["opportunities", "patterns", "signals"] as BuilderTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBuilderTab(tab)}
                  className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    builderTab === tab ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab}
                  {tab === "opportunities" && <span className="ml-1 text-xs text-slate-500">({opportunities.length})</span>}
                  {tab === "signals" && <span className="ml-1 text-xs text-slate-500">({signals.length})</span>}
                </button>
              ))}
            </div>

            {/* Opportunities tab */}
            {builderTab === "opportunities" && (
              <div className="space-y-3">
                {opportunities.map((opp) => (
                  <div key={opp.opportunity_id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="text-2xl">{opp.opportunity_id.startsWith("opp_") ? "🔥" : "💡"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${SEVERITY_BG[opp.urgency] || SEVERITY_BG.medium}`}>
                            {opp.urgency.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-500">
                            {opp.regions_affected.map((r) => REGION_EMOJI[r] || "🌏").join(" ")}
                          </span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                            {opp.trend_direction}
                          </span>
                        </div>
                        <h3 className="mt-2 text-base font-semibold text-white">{opp.pattern_name}</h3>
                        <p className="mt-1 text-sm text-slate-400">{opp.description}</p>
                        <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                          <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Product Opportunity</div>
                          <div className="mt-1 text-sm text-emerald-200">{opp.product_opportunity}</div>
                        </div>
                        {opp.data_gaps.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="text-xs text-slate-500">Data gaps:</span>
                            {opp.data_gaps.map((g, i) => (
                              <span key={i} className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{g}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-600">First detected: {opp.first_detected}</div>
                  </div>
                ))}
                {opportunities.length === 0 && <EmptyState message="No market opportunities detected yet." />}
              </div>
            )}

            {/* Patterns tab */}
            {builderTab === "patterns" && (
              <div className="space-y-3">
                {signals.map((sig) =>
                  sig.market_intelligence.consolidation_signals.map((consol, i) => (
                    <div key={`${sig.signal_id}_${i}`} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🔥</span>
                        <span className="text-xs font-mono text-slate-500">{consol.pattern}</span>
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium border ${SEVERITY_BG[consol.urgency] || SEVERITY_BG.medium}`}>
                          {consol.urgency}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{consol.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {consol.regions_affected.map((r) => (
                          <span key={r} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                            {REGION_EMOJI[r] || "🌏"} {r}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-200">
                        💡 {consol.product_opportunity}
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-slate-500">
                        <span>{consol.event_count} events</span>
                        <span>Trend: {consol.trend_direction}</span>
                        <span>Since: {consol.first_detected}</span>
                      </div>
                    </div>
                  ))
                )}
                {signals.flatMap((s) => s.market_intelligence.consolidation_signals).length === 0 && (
                  <EmptyState message="No consolidation patterns detected yet." />
                )}
              </div>
            )}

            {/* Signals tab (raw) */}
            {builderTab === "signals" && (
              <div className="space-y-3">
                {signals.map((sig) => (
                  <div key={sig.signal_id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                        {sig.cohort}
                      </span>
                      <span className="text-xs text-slate-500">{sig.date} · {sig.region_focus}</span>
                      <span className="ml-auto text-xs text-slate-600 font-mono">{sig.signal_id}</span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {sig.market_intelligence.arbitrage_signals.map((arb, i) => (
                        <div key={i} className="rounded-lg bg-slate-800/30 p-3">
                          <div className="text-xs font-medium text-amber-400">Arbitrage</div>
                          <div className="mt-1 text-sm text-slate-300">{arb.description}</div>
                          <div className="mt-2 text-xs text-emerald-300">💡 {arb.opportunity}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {signals.length === 0 && <EmptyState message="No signals in archive." />}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      <div className="mt-2 h-1 w-full rounded-full bg-slate-800">
        <div className="h-1 rounded-full" style={{ width: "60%", backgroundColor: color }} />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
      {message}
    </div>
  );
}
