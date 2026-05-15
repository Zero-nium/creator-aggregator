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
   TYPES — Swarm Archive Schema (May 2026)
   ═══════════════════════════════════════════════════════════════ */

interface ArchiveMeta {
  archive_id: string;
  title: string;
  coverage_start: string;
  coverage_end: string;
  region_focus: string[];
  platform_focus: string[];
  as_of: string;
}

interface Cohort {
  swarm_id: string;
  agent_name?: string;
  status: string;
  primary_focus: string[];
}

interface Metric {
  name: string;
  raw_text: string;
  value?: number;
  unit?: string;
  currency?: string;
}

interface EventRecord {
  event_id: string;
  date: string;
  title: string;
  category: string;
  platforms?: string[];
  regions?: string[];
  cohorts?: string[];
  swarm_ids?: string[];
  metrics?: Metric[];
  themes?: string[];
  technical_version?: string;
  label_example?: string;
  confidence?: string;
  ingestion_status?: string;
}

interface Benchmark {
  benchmark_id: string;
  date: string;
  metric_name: string;
  metric_type: string;
  platform?: string;
  value_type?: string;
  min_value?: number;
  max_value?: number;
  value?: number;
  return_value?: number;
  spend_value?: number;
  currency?: string;
  unit?: string;
  raw_text: string;
  regions?: string[];
  cohorts?: string[];
  interpretation?: string;
}

interface Risk {
  risk_id: string;
  date_identified: string;
  risk_type: string;
  title: string;
  description?: string;
  affected_product?: string;
  affected_version?: string;
  patch_status?: string;
  severity?: string;
  platforms?: string[];
  regions?: string[];
  cohorts?: string[];
  required_codes?: string[];
  recommended_action?: string;
}

interface Trend {
  trend_id: string;
  date: string;
  trend_name: string;
  trend_type?: string;
  momentum?: string;
  regions?: string[];
  cohorts?: string[];
  related_themes?: string[];
  platforms?: string[];
}

interface RegulatoryRequirement {
  regulatory_id: string;
  date_identified: string;
  platform: string;
  market: string;
  regulator: string;
  requirement_type: string;
  required_codes?: string[];
  affected_cohorts?: string[];
  campaign_blocking?: boolean;
  validation_required_before_launch?: boolean;
}

interface SwarmArchive {
  archive: ArchiveMeta;
  swarm: Record<string, Cohort>;
  events: EventRecord[];
  benchmarks: Benchmark[];
  risks: Risk[];
  trends: Trend[];
  regulatory_requirements: RegulatoryRequirement[];
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const COHORT_COLORS: Record<string, string> = {
  health: "#10b981",
  beauty: "#ec4899",
  gaming: "#6366f1",
  all: "#f59e0b",
};

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#06b6d4"];

const CATEGORY_BADGES: Record<string, string> = {
  financial_market_signal: "bg-emerald-500/10 text-emerald-300",
  product_launch: "bg-indigo-500/10 text-indigo-300",
  live_commerce_deployment: "bg-pink-500/10 text-pink-300",
  industry_event: "bg-blue-500/10 text-blue-300",
  platform_provenance_update: "bg-amber-500/10 text-amber-300",
  agent_initialization: "bg-slate-500/10 text-slate-300",
};

/* ═══════════════════════════════════════════════════════════════
   MOCK ARCHIVE DATA — May 2026 APAC Research
   ═══════════════════════════════════════════════════════════════ */

const MOCK_ARCHIVE: SwarmArchive = {
  archive: {
    archive_id: "uce_archive_2026_05_apac_youtube",
    title: "Universal Creator Economy Research Archive (May 2026)",
    coverage_start: "2026-05-08",
    coverage_end: "2026-05-15",
    region_focus: ["APAC"],
    platform_focus: ["YouTube", "YouTube Shorts", "TikTok Shop", "AnyMind"],
    as_of: "2026-05-15",
  },
  swarm: {
    health: {
      swarm_id: "73694b3e",
      agent_name: "Aura-YT-APAC-Health",
      status: "active intelligence stream",
      primary_focus: ["wellness", "gut_health", "longevity", "NMN", "digital_therapeutics"],
    },
    beauty: {
      swarm_id: "a7884c3e",
      status: "commerce/compliance watch",
      primary_focus: ["beauty_commerce", "live_commerce", "BPOM_compliance"],
    },
    gaming: {
      swarm_id: "a8884c3e",
      status: "benchmark and monetization watch",
      primary_focus: ["Shorts_RPM", "subscriber_lift", "C2PA_provenance"],
    },
  },
  events: [
    {
      event_id: "evt_2026_05_15_anymind_q1",
      date: "2026-05-15",
      title: "AnyMind Q1 Revenue and Operating Profit Plan",
      category: "financial_market_signal",
      platforms: ["AnyMind"],
      regions: ["APAC"],
      cohorts: ["health", "beauty"],
      swarm_ids: ["73694b3e", "a7884c3e"],
      metrics: [
        { name: "Q1 Revenue", raw_text: "17.74B JPY", value: 17.74, unit: "B JPY", currency: "JPY" },
        { name: "Operating Profit Plan", raw_text: "JPY 3.06B", value: 3.06, unit: "B JPY", currency: "JPY" },
      ],
    },
    {
      event_id: "evt_2026_05_15_google_health_coach",
      date: "2026-05-15",
      title: "Google Health Coach rollout scheduled for May 19, 2026",
      category: "product_launch",
      platforms: ["Google"],
      regions: ["APAC"],
      cohorts: ["health"],
      swarm_ids: ["73694b3e"],
      metrics: [
        { name: "Subscription Price", raw_text: "$9.99/mo", value: 9.99, currency: "USD", unit: "/mo" },
      ],
    },
    {
      event_id: "evt_2026_05_14_samsung_anylive",
      date: "2026-05-14",
      title: "Samsung AnyLive deployment across 8 APAC markets",
      category: "live_commerce_deployment",
      platforms: ["Samsung AnyLive"],
      regions: ["APAC"],
      cohorts: ["beauty", "health"],
      swarm_ids: ["a7884c3e", "73694b3e"],
      metrics: [
        { name: "APAC Markets", raw_text: "8", value: 8, unit: "markets" },
        { name: "Incremental Live-Commerce Capacity", raw_text: "+4,450 hrs/mo", value: 4450, unit: "hrs/mo" },
      ],
    },
    {
      event_id: "evt_2026_05_13_asia_summit_global_health",
      date: "2026-05-13",
      title: "Asia Summit on Global Health — Mental Health & Digital Therapeutics",
      category: "industry_event",
      platforms: ["YouTube"],
      regions: ["APAC"],
      cohorts: ["health"],
      swarm_ids: ["73694b3e"],
      themes: ["Mental Health", "Digital Therapeutics"],
    },
    {
      event_id: "evt_2026_05_13_youtube_wellbeing_fund",
      date: "2026-05-13",
      title: "YouTube announces $20M wellbeing fund",
      category: "financial_market_signal",
      platforms: ["YouTube"],
      regions: ["APAC"],
      cohorts: ["health"],
      swarm_ids: ["73694b3e"],
      metrics: [{ name: "Fund Amount", raw_text: "$20M", value: 20, currency: "USD", unit: "M" }],
    },
    {
      event_id: "evt_2026_05_13_fibermaxxing",
      date: "2026-05-13",
      title: "Fibermaxxing trend surging in Japan and Southeast Asia",
      category: "industry_event",
      platforms: ["YouTube", "YouTube Shorts"],
      regions: ["Japan", "Southeast Asia"],
      cohorts: ["health"],
      swarm_ids: ["73694b3e"],
      themes: ["gut_health", "nutrition", "wellness"],
    },
    {
      event_id: "evt_2026_05_12_youtube_c2pa",
      date: "2026-05-12",
      title: "YouTube C2PA v2.1+ manifest support",
      category: "platform_provenance_update",
      platforms: ["YouTube"],
      regions: ["Global"],
      cohorts: ["health", "beauty", "gaming"],
      swarm_ids: ["73694b3e", "a7884c3e", "a8884c3e"],
      technical_version: "C2PA v2.1+",
      label_example: "Captured with a camera",
    },
    {
      event_id: "evt_2026_05_11_apac_wellness_roi",
      date: "2026-05-11",
      title: "APAC wellness performance ROI benchmark recorded",
      category: "financial_market_signal",
      platforms: ["YouTube"],
      regions: ["APAC"],
      cohorts: ["health", "beauty"],
      swarm_ids: ["73694b3e", "a7884c3e"],
      metrics: [{ name: "Performance ROI", raw_text: "$5.78 per $1 spent", value: 5.78, currency: "USD" }],
    },
    {
      event_id: "evt_2026_05_10_health_themes",
      date: "2026-05-10",
      title: "Top Health Themes Confirmed: Gut Health, Longevity, NMN",
      category: "industry_event",
      platforms: ["YouTube"],
      regions: ["APAC"],
      cohorts: ["health"],
      swarm_ids: ["73694b3e"],
      themes: ["Gut Health", "Longevity", "NMN"],
    },
    {
      event_id: "evt_2026_05_09_youtube_shorts_subscriber_lift",
      date: "2026-05-09",
      title: "YouTube Shorts subscriber lift benchmark",
      category: "financial_market_signal",
      platforms: ["YouTube Shorts"],
      regions: ["APAC"],
      cohorts: ["health", "beauty", "gaming"],
      swarm_ids: ["73694b3e", "a7884c3e", "a8884c3e"],
      metrics: [
        { name: "Subscriber Lift", raw_text: "15-20%", value: 17.5, unit: "percent" },
      ],
    },
    {
      event_id: "evt_2026_05_08_health_initialized",
      date: "2026-05-08",
      title: "Aura-YT-APAC-Health initialized",
      category: "agent_initialization",
      platforms: ["YouTube"],
      regions: ["APAC"],
      cohorts: ["health"],
      swarm_ids: ["73694b3e"],
    },
  ],
  benchmarks: [
    {
      benchmark_id: "bmk_youtube_shorts_rpm_2026_05_14",
      date: "2026-05-14",
      metric_name: "YouTube Shorts RPM",
      metric_type: "monetization",
      platform: "YouTube Shorts",
      value_type: "range",
      min_value: 0.03,
      max_value: 0.15,
      currency: "USD",
      unit: "RPM",
      raw_text: "$0.03–$0.15",
      regions: ["APAC"],
      cohorts: ["health", "beauty", "gaming"],
      interpretation: "Baseline short-form ad monetization benchmark. Shorts alone insufficient as primary revenue.",
    },
    {
      benchmark_id: "bmk_apac_wellness_roi_2026_05_11",
      date: "2026-05-11",
      metric_name: "APAC Wellness Performance ROI",
      metric_type: "roi",
      value_type: "scalar",
      return_value: 5.78,
      spend_value: 1,
      currency: "USD",
      raw_text: "$5.78 per $1 spent in APAC wellness",
      regions: ["APAC"],
      cohorts: ["health", "beauty"],
      interpretation: "Strong signal for wellness campaign efficiency.",
    },
    {
      benchmark_id: "bmk_shorts_subscriber_lift_2026_05_09",
      date: "2026-05-09",
      metric_name: "YouTube Shorts Subscriber Lift",
      metric_type: "growth",
      platform: "YouTube Shorts",
      value_type: "range",
      min_value: 15,
      max_value: 20,
      unit: "percent",
      raw_text: "15–20%",
      regions: ["APAC"],
      cohorts: ["health", "beauty", "gaming"],
      interpretation: "Shorts remain strong top-of-funnel acquisition channel.",
    },
  ],
  risks: [
    {
      risk_id: "risk_pixel_watch_sensor_bug_v3_57_1_2",
      date_identified: "2026-05-15",
      risk_type: "technical",
      title: "Pixel Watch sensor bug remains unpatched",
      description: "Pixel Watch sensor bug on version v3.57.1.2 remains unpatched as of May 15, 2026. Creators using Pixel Watch data for health claims may face accuracy issues.",
      affected_product: "Pixel Watch",
      affected_version: "v3.57.1.2",
      patch_status: "unpatched",
      severity: "medium",
      platforms: ["Google", "Pixel Watch"],
      regions: ["APAC"],
      cohorts: ["health"],
      recommended_action: "Flag biometric or sensor-based health claims until patch status changes.",
    },
    {
      risk_id: "risk_tiktok_shop_indonesia_bpom",
      date_identified: "2026-05-15",
      risk_type: "regulatory",
      title: "TikTok Shop Indonesia BPOM product-code compliance enforcement",
      description: "TikTok Shop Indonesia is enforcing BPOM-related product compliance. Campaigns may be blocked without valid codes.",
      platforms: ["TikTok Shop"],
      regions: ["Indonesia"],
      cohorts: ["beauty", "health"],
      required_codes: ["NA", "SD", "SI", "TR", "TI", "MD", "ML"],
      recommended_action: "Validate BPOM codes before campaign launch.",
    },
  ],
  trends: [
    {
      trend_id: "trend_fibermaxxing_2026_05_13",
      date: "2026-05-13",
      trend_name: "Fibermaxxing",
      trend_type: "content_theme",
      momentum: "surging",
      regions: ["Japan", "Southeast Asia"],
      cohorts: ["health"],
      related_themes: ["gut_health", "nutrition", "wellness"],
      platforms: ["YouTube", "YouTube Shorts"],
    },
    {
      trend_id: "trend_gut_health_2026_05_10",
      date: "2026-05-10",
      trend_name: "Gut Health",
      trend_type: "content_theme",
      momentum: "stable",
      regions: ["APAC"],
      cohorts: ["health"],
      related_themes: ["nutrition", "wellness", "fibermaxxing"],
      platforms: ["YouTube"],
    },
    {
      trend_id: "trend_longevity_nmn_2026_05_10",
      date: "2026-05-10",
      trend_name: "Longevity / NMN",
      trend_type: "content_theme",
      momentum: "stable",
      regions: ["APAC"],
      cohorts: ["health"],
      related_themes: ["supplements", "wellness", "anti-aging"],
      platforms: ["YouTube"],
    },
  ],
  regulatory_requirements: [
    {
      regulatory_id: "reg_2026_05_tiktok_shop_indonesia_bpom",
      date_identified: "2026-05-15",
      platform: "TikTok Shop",
      market: "Indonesia",
      regulator: "BPOM",
      requirement_type: "product_code_compliance",
      required_codes: ["NA", "SD", "SI", "TR", "TI", "MD", "ML"],
      affected_cohorts: ["beauty", "health"],
      campaign_blocking: true,
      validation_required_before_launch: true,
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

type CohortKey = "all" | "health" | "beauty" | "gaming";
type ViewTab = "overview" | "events" | "benchmarks" | "risks" | "trends" | "regulatory" | "raw";

export default function DashboardPage() {
  const [activeCohort, setActiveCohort] = useState<CohortKey>("all");
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");
  const [archive, setArchive] = useState<SwarmArchive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ─── Fetch ─── */
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Try backend first, fallback to mock
        const res = await fetch("/api/v1/archive/latest");
        if (res.ok) {
          const data: SwarmArchive = await res.json();
          if (!cancelled) setArchive(data);
        } else {
          console.warn("Backend archive not available, using mock data");
          if (!cancelled) setArchive(MOCK_ARCHIVE);
        }
      } catch (err: any) {
        console.warn("Fetch failed, using mock data:", err.message);
        if (!cancelled) setArchive(MOCK_ARCHIVE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  /* ─── Derived: filter by cohort ─── */
  const filtered = useMemo(() => {
    if (!archive) return null;
    if (activeCohort === "all") return archive;

    const cohortEvents = archive.events.filter(
      (e) => e.cohorts?.includes(activeCohort) || e.swarm_ids?.includes(archive.swarm[activeCohort]?.swarm_id)
    );
    const cohortBenchmarks = archive.benchmarks.filter((b) => b.cohorts?.includes(activeCohort));
    const cohortRisks = archive.risks.filter((r) => r.cohorts?.includes(activeCohort));
    const cohortTrends = archive.trends.filter((t) => t.cohorts?.includes(activeCohort));
    const cohortRegulatory = archive.regulatory_requirements.filter((r) => r.affected_cohorts?.includes(activeCohort));

    return {
      ...archive,
      events: cohortEvents,
      benchmarks: cohortBenchmarks,
      risks: cohortRisks,
      trends: cohortTrends,
      regulatory_requirements: cohortRegulatory,
    };
  }, [archive, activeCohort]);

  /* ─── Overview charts ─── */
  const eventCategoryData = useMemo(() => {
    if (!filtered) return [];
    const counts: Record<string, number> = {};
    filtered.events.forEach((e) => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const benchmarkValueData = useMemo(() => {
    if (!filtered) return [];
    return filtered.benchmarks
      .filter((b) => b.value !== undefined || b.min_value !== undefined)
      .map((b) => ({
        name: b.metric_name,
        value: b.value ?? b.min_value ?? 0,
        raw: b.raw_text,
      }));
  }, [filtered]);

  const trendMomentumData = useMemo(() => {
    if (!filtered) return [];
    const counts: Record<string, number> = {};
    filtered.trends.forEach((t) => {
      const m = t.momentum || "unknown";
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  /* ─── Render helpers ─── */
  if (!archive) return null;

  const meta = archive.archive;
  const swarmEntries = Object.entries(archive.swarm);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* ═══════ HEADER ═══════ */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Creator Aggregator</h1>
              <p className="mt-1 text-slate-400">Agent-Powered Trend Intelligence</p>
            </div>
            {meta && (
              <div className="text-right text-xs text-slate-500">
                <div className="font-medium text-slate-300">{meta.title}</div>
                <div>{meta.coverage_start} → {meta.coverage_end}</div>
                <div>{meta.region_focus.join(", ")} · {meta.platform_focus.join(", ")}</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
            Loading swarm archive…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {/* ═══════ COHORT NAVIGATION ═══════ */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(["all", "health", "beauty", "gaming"] as CohortKey[]).map((c) => (
            <button
              key={c}
              onClick={() => setActiveCohort(c)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeCohort === c
                  ? "text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
              style={
                activeCohort === c
                  ? { backgroundColor: COHORT_COLORS[c] }
                  : undefined
              }
            >
              {c === "all" ? "All Cohorts" : c.charAt(0).toUpperCase() + c.slice(1)}
              {c !== "all" && archive.swarm[c] && (
                <span className="ml-1.5 text-xs opacity-75">({archive.swarm[c].swarm_id.slice(0, 8)})</span>
              )}
            </button>
          ))}
        </div>

        {/* Cohort info bar */}
        {activeCohort !== "all" && archive.swarm[activeCohort] && (
          <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COHORT_COLORS[activeCohort] }}
              />
              <span className="font-semibold text-white">{archive.swarm[activeCohort].agent_name || activeCohort}</span>
              <span className="text-xs text-slate-400">{archive.swarm[activeCohort].status}</span>
              <div className="flex flex-wrap gap-1">
                {archive.swarm[activeCohort].primary_focus.map((f) => (
                  <span key={f} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ VIEW TABS ═══════ */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-2">
          {(
            ["overview", "events", "benchmarks", "risks", "trends", "regulatory", "raw"] as ViewTab[]
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
              {tab !== "overview" && tab !== "raw" && filtered && (
                <span className="ml-1 text-xs text-slate-500">
                  ({(filtered as any)[tab === "regulatory" ? "regulatory_requirements" : tab].length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════ OVERVIEW TAB ═══════ */}
        {activeTab === "overview" && filtered && (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Events" value={filtered.events.length} color="#6366f1" />
              <StatCard label="Benchmarks" value={filtered.benchmarks.length} color="#10b981" />
              <StatCard label="Risks" value={filtered.risks.length} color="#f43f5e" />
              <StatCard label="Trends" value={filtered.trends.length} color="#f59e0b" />
            </div>

            {/* Charts row */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Event categories */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="mb-4 text-sm font-semibold text-white">Events by Category</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={eventCategoryData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name }) => name}>
                        {eventCategoryData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Benchmark values */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="mb-4 text-sm font-semibold text-white">Benchmark Values</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={benchmarkValueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-20} textAnchor="end" height={60} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                        formatter={(value: any, _name: any, props: any) => [props.payload.raw, "Value"]}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trend momentum */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="mb-4 text-sm font-semibold text-white">Trend Momentum</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={trendMomentumData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name }) => name}>
                        {trendMomentumData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent events preview */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-sm font-semibold text-white">Recent Events</h3>
              <div className="space-y-3">
                {filtered.events.slice(0, 5).map((evt) => (
                  <div key={evt.event_id} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-800/30 p-3">
                    <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGES[evt.category] || "bg-slate-700 text-slate-300"}`}>
                      {evt.category.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{evt.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {evt.date} · {evt.platforms?.join(", ") || "—"}
                      </div>
                    </div>
                    {evt.metrics && evt.metrics.length > 0 && (
                      <div className="text-right text-xs text-slate-400">
                        {evt.metrics.map((m) => (
                          <div key={m.name}>{m.raw_text}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {filtered.events.length === 0 && (
                  <div className="text-center text-sm text-slate-500">No events for this cohort.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ EVENTS TAB ═══════ */}
        {activeTab === "events" && filtered && (
          <div className="space-y-3">
            {filtered.events.map((evt) => (
              <div key={evt.event_id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_BADGES[evt.category] || "bg-slate-700 text-slate-300"}`}>
                        {evt.category.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-slate-500">{evt.date}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-white">{evt.title}</h3>
                    {evt.themes && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {evt.themes.map((t) => (
                          <span key={t} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {evt.metrics && evt.metrics.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {evt.metrics.map((m) => (
                        <div key={m.name} className="rounded-lg bg-slate-800/50 px-3 py-2 text-center">
                          <div className="text-xs text-slate-500">{m.name}</div>
                          <div className="text-sm font-bold text-white">{m.raw_text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {evt.platforms && <span>Platforms: {evt.platforms.join(", ")}</span>}
                  {evt.regions && <span>· Regions: {evt.regions.join(", ")}</span>}
                  {evt.cohorts && (
                    <span>
                      · Cohorts:{" "}
                      {evt.cohorts.map((c) => (
                        <span key={c} className="ml-1 inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: COHORT_COLORS[c] }} />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {filtered.events.length === 0 && <EmptyState message="No events for this cohort." />}
          </div>
        )}

        {/* ═══════ BENCHMARKS TAB ═══════ */}
        {activeTab === "benchmarks" && filtered && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.benchmarks.map((b) => (
              <div key={b.benchmark_id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="text-xs font-medium text-indigo-300">{b.metric_type}</div>
                <h3 className="mt-1 text-base font-semibold text-white">{b.metric_name}</h3>
                <div className="mt-3 text-2xl font-bold text-white">{b.raw_text}</div>
                {b.value_type === "range" && b.min_value !== undefined && b.max_value !== undefined && (
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: "100%" }}
                    />
                  </div>
                )}
                {b.interpretation && (
                  <p className="mt-3 text-xs text-slate-400">{b.interpretation}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1 text-xs text-slate-500">
                  {b.platform && <span className="rounded bg-slate-800 px-1.5 py-0.5">{b.platform}</span>}
                  {b.regions?.map((r) => (
                    <span key={r} className="rounded bg-slate-800 px-1.5 py-0.5">{r}</span>
                  ))}
                </div>
              </div>
            ))}
            {filtered.benchmarks.length === 0 && <EmptyState message="No benchmarks for this cohort." />}
          </div>
        )}

        {/* ═══════ RISKS TAB ═══════ */}
        {activeTab === "risks" && filtered && (
          <div className="space-y-3">
            {filtered.risks.map((r) => (
              <div key={r.risk_id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    r.risk_type === "technical" ? "bg-amber-500/10 text-amber-300" :
                    r.risk_type === "regulatory" ? "bg-rose-500/10 text-rose-300" :
                    "bg-slate-700 text-slate-300"
                  }`}>
                    {r.risk_type}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    r.severity === "high" ? "bg-red-500/10 text-red-300" :
                    r.severity === "medium" ? "bg-orange-500/10 text-orange-300" :
                    "bg-emerald-500/10 text-emerald-300"
                  }`}>
                    {r.severity}
                  </span>
                  {r.patch_status && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      patch: {r.patch_status}
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-base font-semibold text-white">{r.title}</h3>
                {r.description && <p className="mt-1 text-sm text-slate-400">{r.description}</p>}
                {r.affected_product && (
                  <div className="mt-2 text-xs text-slate-500">
                    Product: {r.affected_product} {r.affected_version && `(${r.affected_version})`}
                  </div>
                )}
                {r.required_codes && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.required_codes.map((code) => (
                      <span key={code} className="rounded bg-rose-500/10 px-1.5 py-0.5 text-xs font-mono text-rose-300">{code}</span>
                    ))}
                  </div>
                )}
                {r.recommended_action && (
                  <div className="mt-3 rounded-lg bg-slate-800/50 p-2 text-xs text-slate-400">
                    <span className="font-medium text-slate-300">Action:</span> {r.recommended_action}
                  </div>
                )}
              </div>
            ))}
            {filtered.risks.length === 0 && <EmptyState message="No risks for this cohort." />}
          </div>
        )}

        {/* ═══════ TRENDS TAB ═══════ */}
        {activeTab === "trends" && filtered && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.trends.map((t) => (
              <div key={t.trend_id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">{t.trend_name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.momentum === "surging" ? "bg-emerald-500/10 text-emerald-300" :
                    t.momentum === "stable" ? "bg-blue-500/10 text-blue-300" :
                    "bg-slate-700 text-slate-300"
                  }`}>
                    {t.momentum}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.related_themes?.map((theme) => (
                    <span key={theme} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{theme}</span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1 text-xs text-slate-500">
                  {t.regions?.map((region) => (
                    <span key={region} className="rounded bg-slate-800 px-1.5 py-0.5">{region}</span>
                  ))}
                  {t.platforms?.map((platform) => (
                    <span key={platform} className="rounded bg-slate-800 px-1.5 py-0.5">{platform}</span>
                  ))}
                </div>
              </div>
            ))}
            {filtered.trends.length === 0 && <EmptyState message="No trends for this cohort." />}
          </div>
        )}

        {/* ═══════ REGULATORY TAB ═══════ */}
        {activeTab === "regulatory" && filtered && (
          <div className="space-y-3">
            {filtered.regulatory_requirements.map((reg) => (
              <div key={reg.regulatory_id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-300">
                    {reg.regulator}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                    {reg.platform} · {reg.market}
                  </span>
                  {reg.campaign_blocking && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-300">
                      campaign blocking
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-base font-semibold text-white">{reg.requirement_type.replace(/_/g, " ")}</h3>
                <div className="mt-3 flex flex-wrap gap-1">
                  {reg.required_codes?.map((code) => (
                    <span key={code} className="rounded bg-rose-500/10 px-2 py-0.5 text-xs font-mono text-rose-300">{code}</span>
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Affected cohorts: {reg.affected_cohorts?.join(", ")}
                </div>
              </div>
            ))}
            {filtered.regulatory_requirements.length === 0 && <EmptyState message="No regulatory requirements for this cohort." />}
          </div>
        )}

        {/* ═══════ RAW TAB ═══════ */}
        {activeTab === "raw" && filtered && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Raw Archive Data</h3>
            <pre className="overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-300">
              {JSON.stringify(filtered, null, 2)}
            </pre>
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
