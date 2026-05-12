"use client";

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// --- Types matching your API schema ---
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

// --- Color palette ---
const COLORS = {
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  accent: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  slate: "#64748b",
};

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

// --- API Configuration ---
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://agent-dashboard-api-windblown-fog-6023.fly.dev";

// --- Components ---

function MetricCard({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        {trend && (
          <span className="text-sm font-medium text-emerald-600">{trend}</span>
        )}
      </div>
    </div>
  );
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900">{insight.title}</h3>
          <p className="mt-2 text-slate-600 leading-relaxed">{insight.description}</p>

          {insight.metrics.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4">
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
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="ml-4 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold">
            {index + 1}
          </div>
        </div>
      </div>
    </div>
  );
}

function CitationList({ citations }: { citations: Citation[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Sources & Citations</h3>
      <div className="space-y-3">
        {citations.map((cite, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-md">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-blue-600">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900">{cite.source}</p>
              {cite.context && (
                <p className="text-sm text-slate-500 mt-0.5">{cite.context}</p>
              )}
              {cite.url && (
                <a
                  href={cite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-block truncate"
                >
                  {cite.url}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Mock data for initial render / fallback ---
const MOCK_REPORT: DailyReport = {
  reportId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  date: "2026-05-11",
  metadata: {
    platform: "YouTube",
    region: "APAC",
    niche: "Health",
    agentId: "Aura-YT-APAC-Health",
  },
  insights: [
    {
      title: "Content Authenticity & C2PA Rollout",
      description:
        "YouTube has officially implemented support for C2PA v2.1 manifests. Videos verified as untampered capture now display a 'Captured with a camera' label.",
      metrics: [{ label: "CTR Lift on Verified Content", value: "12%" }],
      tags: ["Trust", "AI Policy", "Transparency"],
    },
    {
      title: "APAC ROI & Performance Benchmarks",
      description:
        "73% of influencer campaigns in APAC are now performance-driven (CPC/CPA). Micro and nano health creators are driving >40% of total campaign impact.",
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

// --- Main Dashboard ---

export default function Dashboard() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "insights" | "sources" | "raw">("overview");

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/v1/reports/latest`);

      if (!response.ok) {
        if (response.status === 404) {
          // No reports yet, use mock data
          setReport(MOCK_REPORT);
          setError("No live reports found. Showing sample data.");
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setReport(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch report:", err);
      setReport(MOCK_REPORT);
      setError("API unavailable. Showing sample data.");
    } finally {
      setLoading(false);
    }
  }

  // Prepare chart data from metrics
  const chartData = report?.insights.flatMap((insight, i) =>
    insight.metrics.map((metric) => ({
      name: metric.label,
      value: parseFloat(metric.value.replace(/[^0-9.]/g, "")) || 0,
      insight: insight.title,
      fullValue: metric.value,
    }))
  ) || [];

  // Tag distribution
  const tagCounts = report?.insights.reduce((acc, insight) => {
    insight.tags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const tagChartData = Object.entries(tagCounts || {}).map(([name, value]) => ({
    name,
    value,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">No report data available</p>
          <button
            onClick={fetchReport}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
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
                <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  {error}
                </span>
              )}
              <button
                onClick={fetchReport}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <div className="text-sm text-slate-500">
                {report.date}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-6 -mb-px">
            {(["overview", "insights", "sources", "raw"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metadata Banner */}
        <div className="mb-8 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            {report.metadata.platform}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-violet-50 text-violet-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {report.metadata.region}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            {report.metadata.niche}
          </span>
          {report.metadata.agentId && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              {report.metadata.agentId}
            </span>
          )}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Platform" value={report.metadata.platform} />
              <MetricCard label="Region" value={report.metadata.region} />
              <MetricCard label="Niche" value={report.metadata.niche} />
              <MetricCard label="Insights" value={String(report.insights.length)} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Metrics Bar Chart */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Key Metrics</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                      formatter={(value: number, name: string, props: any) => [props.payload.fullValue, props.payload.insight]}
                    />
                    <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tag Distribution */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Tag Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={tagChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {tagChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {tagChartData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-sm text-slate-600">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Insights Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Latest Insights</h3>
              <div className="space-y-4">
                {report.insights.slice(0, 2).map((insight, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-600">{i + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">{insight.title}</h4>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "insights" && (
          <div className="space-y-6">
            {report.insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} index={i} />
            ))}
          </div>
        )}

        {activeTab === "sources" && (
          <CitationList citations={report.citations} />
        )}

        {activeTab === "raw" && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Raw Report Data</h3>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(report, null, 2))}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Copy JSON
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{JSON.stringify(report, null, 2)}</code>
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
