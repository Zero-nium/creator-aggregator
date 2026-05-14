"use client";

import React, { useState, useEffect } from "react";
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

// --- Types ---
interface Metric {
  label: string;
  value: string;
}

interface Insight {
  title: string;
  description: string;
  metrics: Metric[];
  tags: string[];
}

interface Citation {
  source: string;
  context?: string;
  url?: string;
}

interface ReportMetadata {
  platform: string;
  region: string;
  niche: string;
  agentId?: string;
}

interface DailyReport {
  reportId: string;
  date: string;
  metadata: ReportMetadata;
  insights: Insight[];
  citations: Citation[];
}

interface RawPayload {
  id: number;
  agent_id: string;
  status: string;
  received_at: string;
  payload: any;
  processed_at?: string;
}

// --- Constants ---
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://agent-dashboard-api-windblown-fog-6023.fly.dev";
const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

// --- Mock Data for Fallback ---
const MOCK_REPORT: DailyReport = {
  reportId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  date: "2026-05-12",
  metadata: {
    platform: "YouTube",
    region: "APAC",
    niche: "Health",
    agentId: "Aura-YT-APAC-Health",
  },
  insights: [
    {
      title: "Content Authenticity & C2PA Rollout",
      description: "YouTube has officially implemented support for C2PA v2.1 manifests. Videos verified as untampered capture now display a 'Captured with a camera' label.",
      metrics: [{ label: "CTR Lift on Verified Content", value: "12%" }],
      tags: ["Trust", "AI Policy", "Transparency"],
    },
    {
      title: "APAC ROI & Performance Benchmarks",
      description: "73% of influencer campaigns in APAC are now performance-driven (CPC/CPA). Micro and nano health creators are driving >40% of total campaign impact.",
      metrics: [
        { label: "Performance-Driven Campaigns", value: "73%" },
        { label: "Micro-Influencer Impact", value: ">40%" },
      ],
      tags: ["ROI", "Performance Marketing", "Micro-Influencers"],
    },
  ],
  citations: [
    {
      source: "YouTube Help / Content Credentials Technical Update",
      context: "C2PA/Provenance",
      url: "https://support.google.com/youtube/answer/14730417",
    },
    {
      source: "AnyMind Group",
      context: "State of Influence in APAC 2026",
      url: "https://anymindgroup.com/news/report/state-of-influence-in-apac-2026/",
    },
  ],
};

const MOCK_RAW: RawPayload[] = [
  {
    id: 1,
    agent_id: "Aura-YT-APAC-Health",
    status: "processed",
    received_at: "2026-05-12T10:16:23Z",
    processed_at: "2026-05-12T10:29:39Z",
    payload: { trend: "AI video editing", score: 85, region: "APAC", platform: "YouTube" },
  },
  {
    id: 2,
    agent_id: "Aura-IG-NA-Fashion",
    status: "pending",
    received_at: "2026-05-12T11:00:00Z",
    payload: { trend: "Sustainable fashion", score: 72, region: "NA", platform: "Instagram" },
  },
];

// --- Components ---

function Badge({ children, color = "blue" }: { children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[color] || colorMap.blue}`}>
      {children}
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  );
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900">{insight.title}</h3>
          <p className="mt-2 text-slate-600 text-sm leading-relaxed">{insight.description}</p>

          {insight.metrics.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {insight.metrics.map((metric, i) => (
                <div key={i} className="bg-slate-50 rounded-md p-3">
                  <p className="text-xs text-slate-500">{metric.label}</p>
                  <p className="text-lg font-bold text-slate-900">{metric.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {insight.tags.map((tag, i) => (
              <Badge key={i}>{tag}</Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function CitationList({ citations }: { citations: Citation[] }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Sources & Citations</h3>
      <div className="space-y-3">
        {citations.map((cite, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-md">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 text-sm">{cite.source}</p>
              {cite.context && <p className="text-xs text-slate-500 mt-0.5">{cite.context}</p>}
              {cite.url && (
                <a href={cite.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block truncate max-w-full">
                  {cite.url}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// --- Main Dashboard ---

export default function Dashboard() {
  const [activeView, setActiveView] = useState<"global" | "specific">("global");
  const [activeTab, setActiveTab] = useState<"overview" | "insights" | "sources" | "raw">("overview");
  const [report, setReport] = useState<DailyReport | null>(null);
  const [rawData, setRawData] = useState<RawPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for Specific Trends
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterGenre, setFilterGenre] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch latest report
      const reportRes = await fetch(`${API_BASE}/api/v1/reports/latest`);
      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setReport(reportData);
      } else {
        setReport(MOCK_REPORT);
        setError("Using sample data — no live reports found");
      }

      // Fetch raw payloads (we'll need to add this endpoint to backend)
      // For now, use mock
      setRawData(MOCK_RAW);

    } catch (err) {
      console.error("Failed to fetch:", err);
      setReport(MOCK_REPORT);
      setRawData(MOCK_RAW);
      setError("API unavailable. Showing sample data.");
    } finally {
      setLoading(false);
    }
  }

  // Prepare chart data
  const chartData = report?.insights.flatMap((insight) =>
    insight.metrics.map((metric) => ({
      name: metric.label.length > 20 ? metric.label.slice(0, 20) + "..." : metric.label,
      value: parseFloat(metric.value.replace(/[^0-9.]/g, "")) || 0,
      fullValue: metric.value,
      insight: insight.title,
    }))
  ) || [];

  const tagCounts = report?.insights.reduce((acc, insight) => {
    insight.tags.forEach((tag) => { acc[tag] = (acc[tag] || 0) + 1; });
    return acc;
  }, {} as Record<string, number>);

  const tagChartData = Object.entries(tagCounts || {}).map(([name, value]) => ({ name, value }));

  // Filter raw data
  const filteredRaw = rawData.filter((item) => {
    const p = item.payload || {};
    const regionMatch = filterRegion === "all" || p.region === filterRegion || !p.region;
    const platformMatch = filterPlatform === "all" || p.platform === filterPlatform || !p.platform;
    const genreMatch = filterGenre === "all" || p.genre === filterGenre || !p.genre;
    return regionMatch && platformMatch && genreMatch;
  });

  // Extract unique filter options from raw data
  const regions = Array.from(new Set(rawData.map(r => r.payload?.region).filter(Boolean)));
  const platforms = Array.from(new Set(rawData.map(r => r.payload?.region).filter(Boolean)));
  const genres = Array.from(new Set(rawData.map(r => r.payload?.region).filter(Boolean)));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Creator Aggregator</h1>
                <p className="text-xs text-slate-500">Agent-Powered Trend Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {error && (
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                  {error}
                </span>
              )}
              <button
                onClick={fetchData}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              {report && (
                <span className="text-sm text-slate-500">{report.date}</span>
              )}
            </div>
          </div>

          {/* Primary Navigation: Global vs Specific */}
          <div className="flex gap-1 -mb-px">
            <button
              onClick={() => setActiveView("global")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeView === "global"
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Global Trends
              </span>
            </button>
            <button
              onClick={() => setActiveView("specific")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeView === "specific"
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Specific Trends
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ==================== GLOBAL TRENDS ==================== */}
        {activeView === "global" && report && (
          <div className="space-y-6">
            {/* Metadata Banner */}
            <div className="flex flex-wrap gap-2">
              <Badge color="blue">{report.metadata.platform}</Badge>
              <Badge color="violet">{report.metadata.region}</Badge>
              <Badge color="emerald">{report.metadata.niche}</Badge>
              {report.metadata.agentId && (
                <Badge color="slate">{report.metadata.agentId}</Badge>
              )}
            </div>

            {/* Secondary Tabs */}
            <div className="flex gap-2">
              {(["overview", "insights", "sources", "raw"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard label="Platform" value={report.metadata.platform} />
                  <MetricCard label="Region" value={report.metadata.region} />
                  <MetricCard label="Niche" value={report.metadata.niche} />
                  <MetricCard label="Insights" value={String(report.insights.length)} />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h3 className="text-base font-semibold text-slate-900 mb-4">Key Metrics</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#fff", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                          formatter={(value: number, name: string, props: any) => [props.payload.fullValue, props.payload.insight]}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-base font-semibold text-slate-900 mb-4">Tag Distribution</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={tagChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {tagChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex flex-wrap gap-3 justify-center">
                      {tagChartData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                          <span className="text-xs text-slate-600">{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Quick Insights */}
                <Card className="p-6">
                  <h3 className="text-base font-semibold text-slate-900 mb-3">Latest Insights</h3>
                  <div className="space-y-3">
                    {report.insights.slice(0, 2).map((insight, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-600">{i + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900 text-sm">{insight.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{insight.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "insights" && (
              <div className="space-y-4">
                {report.insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} index={i} />
                ))}
              </div>
            )}

            {activeTab === "sources" && <CitationList citations={report.citations} />}

            {activeTab === "raw" && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-slate-900">Raw Report Data</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(report, null, 2))}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs leading-relaxed">
                  <code>{JSON.stringify(report, null, 2)}</code>
                </pre>
              </Card>
            )}
          </div>
        )}

        {/* ==================== SPECIFIC TRENDS ==================== */}
        {activeView === "specific" && (
          <div className="space-y-6">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Region:</label>
                  <select
                    value={filterRegion}
                    onChange={(e) => setFilterRegion(e.target.value)}
                    className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white"
                  >
                    <option value="all">All Regions</option>
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Platform:</label>
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white"
                  >
                    <option value="all">All Platforms</option>
                    {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Genre:</label>
                  <select
                    value={filterGenre}
                    onChange={(e) => setFilterGenre(e.target.value)}
                    className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white"
                  >
                    <option value="all">All Genres</option>
                    {genres.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="ml-auto text-sm text-slate-500">
                  Showing {filteredRaw.length} of {rawData.length} entries
                </div>
              </div>
            </Card>

            {/* Raw Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRaw.map((item) => (
                <Card key={item.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-slate-500">Agent ID</p>
                      <p className="text-sm font-semibold text-slate-900">{item.agent_id}</p>
                    </div>
                    <Badge color={item.status === "processed" ? "emerald" : "amber"}>
                      {item.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {item.payload?.region && (
                        <div><span className="text-slate-500">Region:</span> <span className="font-medium">{item.payload.region}</span></div>
                      )}
                      {item.payload?.platform && (
                        <div><span className="text-slate-500">Platform:</span> <span className="font-medium">{item.payload.platform}</span></div>
                      )}
                      {item.payload?.genre && (
                        <div><span className="text-slate-500">Genre:</span> <span className="font-medium">{item.payload.genre}</span></div>
                      )}
                      {item.payload?.score && (
                        <div><span className="text-slate-500">Score:</span> <span className="font-medium">{item.payload.score}</span></div>
                      )}
                    </div>

                    {item.payload?.trend && (
                      <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                        <span className="text-slate-500">Trend:</span> <span className="font-medium text-slate-900">{item.payload.trend}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                    <span>ID: {item.id}</span>
                    <span>{new Date(item.received_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))}
            </div>

            {filteredRaw.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500">No data matches the selected filters.</p>
                <button
                  onClick={() => { setFilterRegion("all"); setFilterPlatform("all"); setFilterGenre("all"); }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
