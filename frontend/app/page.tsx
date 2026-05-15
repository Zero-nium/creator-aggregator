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

/* ─── Types ─── */
interface ReportMetadata {
  platform: string;
  region: string;
  niche: string;
  agentId?: string;
  date: string;
}

interface Insight {
  title: string;
  description: string;
  confidence: number;
}

interface Metric {
  label: string;
  value: number;
  change: number;
}

interface Report {
  metadata: ReportMetadata;
  insights: Insight[];
  metrics: Metric[];
  tags: Record<string, number>;
  sources: string[];
}

interface RawPayload {
  id: string;
  agent_id: string;
  status: string;
  payload: {
    region?: string;
    platform?: string;
    genre?: string;
    score?: number;
    trend?: string;
    [key: string]: any;
  };
  received_at: string;
}

/* ─── Constants ─── */
const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6"];

/* ─── Component ─── */
export default function DashboardPage() {
  const [activeView, setActiveView] = useState<"global" | "specific">("global");
  const [activeTab, setActiveTab] = useState<"overview" | "insights" | "sources" | "raw">("overview");

  const [report, setReport] = useState<Report | null>(null);
  const [rawData, setRawData] = useState<RawPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Filters */
  const [regionFilter, setRegionFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");

  /* ─── Fetch Data ─── */
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Use relative path — Vercel rewrite proxies to Fly.io
        const reportRes = await fetch("/api/v1/reports/latest");
        if (!reportRes.ok) throw new Error(`Report API ${reportRes.status}`);
        const reportData: Report = await reportRes.json();

        const rawRes = await fetch("/api/v1/agents/payloads");
        if (!rawRes.ok) throw new Error(`Payloads API ${rawRes.status}`);
        const rawDataRes: RawPayload[] = await rawRes.json();

        if (!cancelled) {
          setReport(reportData);
          setRawData(rawDataRes);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to fetch data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  /* ─── Derived Data ─── */
  const tagChartData = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.tags).map(([name, value]) => ({ name, value }));
  }, [report]);

  const filteredRaw = useMemo(() => {
    return rawData.filter((item) => {
      const p = item.payload || {};
      if (regionFilter !== "all" && p.region !== regionFilter) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter) return false;
      if (genreFilter !== "all" && p.genre !== genreFilter) return false;
      return true;
    });
  }, [rawData, regionFilter, platformFilter, genreFilter]);

  const regions = useMemo(() => Array.from(new Set(rawData.map((r) => r.payload?.region).filter(Boolean))), [rawData]);
  const platforms = useMemo(() => Array.from(new Set(rawData.map((r) => r.payload?.platform).filter(Boolean))), [rawData]);
  const genres = useMemo(() => Array.from(new Set(rawData.map((r) => r.payload?.genre).filter(Boolean))), [rawData]);

  /* ─── Render ─── */
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Creator Aggregator
          </h1>
          <p className="mt-1 text-slate-400">
            Agent-Powered Trend Intelligence
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
            <span className="font-semibold">API unavailable:</span> {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
            Loading dashboard data…
          </div>
        )}

        {/* Report Date */}
        {report && (
          <div className="mb-4 text-sm text-slate-500">
            Last updated: {new Date(report.metadata.date).toLocaleString()}
          </div>
        )}

        {/* Primary Navigation */}
        <div className="mb-6 flex gap-2">
          {(["global", "specific"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeView === view
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {view === "global" ? "Global Trends" : "Specific Trends"}
            </button>
          ))}
        </div>

        {/* ==================== GLOBAL TRENDS ==================== */}
        {activeView === "global" && report && (
          <div className="space-y-6">
            {/* Metadata Banner */}
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                {report.metadata.platform}
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                {report.metadata.region}
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                {report.metadata.niche}
              </span>
              {report.metadata.agentId && (
                <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
                  Agent: {report.metadata.agentId}
                </span>
              )}
            </div>

            {/* Secondary Tabs */}
            <div className="flex gap-2 border-b border-slate-800 pb-2">
              {(["overview", "insights", "sources", "raw"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "text-indigo-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Key Metrics */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">Key Metrics</h3>
                  <div className="space-y-4">
                    {report.metrics.map((m, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-slate-400">{m.label}</span>
                        <div className="text-right">
                          <span className="text-xl font-bold text-white">{m.value}</span>
                          <span
                            className={`ml-2 text-sm ${
                              m.change >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {m.change >= 0 ? "+" : ""}
                            {m.change}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={report.metrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tag Distribution */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">Tag Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tagChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {tagChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {tagChartData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-sm text-slate-300">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        {entry.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Insights */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 lg:col-span-2">
                  <h3 className="mb-4 text-lg font-semibold text-white">Latest Insights</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {report.insights.slice(0, 2).map((insight, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-slate-800 bg-slate-800/50 p-4"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
                            {i + 1}
                          </span>
                          <h4 className="font-semibold text-white">{insight.title}</h4>
                        </div>
                        <p className="text-sm text-slate-400">{insight.description}</p>
                        <div className="mt-2 text-xs text-slate-500">
                          Confidence: {Math.round(insight.confidence * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Insights Tab */}
            {activeTab === "insights" && (
              <div className="space-y-4">
                {report.insights.map((insight, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 p-6"
                  >
                    <h4 className="text-lg font-semibold text-white">{insight.title}</h4>
                    <p className="mt-2 text-slate-400">{insight.description}</p>
                    <div className="mt-3 text-sm text-slate-500">
                      Confidence: {Math.round(insight.confidence * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sources Tab */}
            {activeTab === "sources" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Data Sources</h3>
                <ul className="space-y-2">
                  {report.sources.map((source, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {source}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raw Tab */}
            {activeTab === "raw" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Raw Report Data</h3>
                <pre className="overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-300">
                  {JSON.stringify(report, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ==================== SPECIFIC TRENDS ==================== */}
        {activeView === "specific" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Region:</label>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="all">All</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Platform:</label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="all">All</option>
                  {platforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Genre:</label>
                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="all">All</option>
                  {genres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end text-sm text-slate-400">
                Showing {filteredRaw.length} of {rawData.length} entries
              </div>
            </div>

            {/* Raw Data Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRaw.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-slate-700"
                >
                  <div className="mb-3 flex flex-wrap gap-2">
                    {item.payload?.region && (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        Region: {item.payload.region}
                      </span>
                    )}
                    {item.payload?.platform && (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        Platform: {item.payload.platform}
                      </span>
                    )}
                    {item.payload?.genre && (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        Genre: {item.payload.genre}
                      </span>
                    )}
                    {item.payload?.score && (
                      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300">
                        Score: {item.payload.score}
                      </span>
                    )}
                    {item.payload?.trend && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                        Trend: {item.payload.trend}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    ID: {item.id} · {new Date(item.received_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            {filteredRaw.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
                No data matches the selected filters.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
