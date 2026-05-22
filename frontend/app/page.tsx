"use client";

import React, { useEffect, useMemo, useState } from "react";

// ─── Types (match existing API responses, no new expectations) ───

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
  urgency: "critical" | "high" | "medium" | "low";
  first_detected: string;
  event_count: number;
  trend_direction: "strengthening" | "weakening" | "stable";
}

interface ArbitrageSignal {
  description: string;
  opportunity: string;
  data_gap?: string;
  regions_affected: string[];
}

interface AgentSignal {
  signal_id: string;
  date: string;
  swarm_id: string;
  cohort: string;
  region_focus: string;
  creator_intelligence: CreatorIntel[];
  market_intelligence: {
    consolidation_signals: ConsolidationSignal[];
    arbitrage_signals: ArbitrageSignal[];
    emerging_themes: any[];
  };
  narrative: string;
  submitted_at?: string;
}

interface CreatorAlert {
  alert_id: string;
  severity: string;
  region: string;
  headline: string;
  action: string;
  deadline?: string;
  content_formats: string[];
  sources: string[];
}

interface MarketOpportunity {
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

// ─── Constants ───

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://agent-dashboard-api-windblown-fog-6023.fly.dev";

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  regulatory_enforcement: "REGULATION",
  platform_policy: "PLATFORM",
  compliance_deadline: "DEADLINE",
  media_escalation: "MEDIA",
  creator_sentiment: "SENTIMENT",
  baseline: "BASELINE",
};

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  regulatory_enforcement: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  platform_policy: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  compliance_deadline: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  media_escalation: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  creator_sentiment: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  baseline: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  observational: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const TREND_COLORS: Record<string, string> = {
  strengthening: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  stable: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  weakening: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

const REGION_EMOJI: Record<string, string> = {
  Australia: "🇦🇺",
  Japan: "🇯🇵",
  Indonesia: "🇮🇩",
  "South Korea": "🇰🇷",
  India: "🇮🇳",
  "United States": "🇺🇸",
  UK: "🇬🇧",
  Brazil: "🇧🇷",
  Germany: "🇩🇪",
  France: "🇫🇷",
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  observational: 4,
};

const URGENCY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const TREND_ORDER: Record<string, number> = {
  strengthening: 0,
  stable: 1,
  weakening: 2,
};

// ─── Helpers ───

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function daysAgo(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  } catch {
    return "";
  }
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len).trim() + "…";
}

// ─── Components ───

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded border ${variant}`}
    >
      {children}
    </span>
  );
}

function CreatorCard({
  intel,
  signal,
  onClick,
}: {
  intel: CreatorIntel;
  signal: AgentSignal;
  onClick: () => void;
}) {
  const daysLeft = daysUntil(intel.deadline);
  const age = daysAgo(signal.date || signal.submitted_at);
  const regionEmoji = REGION_EMOJI[intel.region] || "🌐";
  const typeLabel = SIGNAL_TYPE_LABELS[intel.signal_type] || intel.signal_type.toUpperCase();
  const typeColor = SIGNAL_TYPE_COLORS[intel.signal_type] || SIGNAL_TYPE_COLORS.baseline;
  const sevColor = SEVERITY_COLORS[intel.severity] || SEVERITY_COLORS.observational;

  return (
    <button
      onClick={onClick}
      className="group text-left w-full bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/50 hover:border-slate-600 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-slate-900/50 hover:-translate-y-0.5"
    >
      {/* Top row: type badge + severity */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant={typeColor}>
          {regionEmoji} {typeLabel}
        </Badge>
        <Badge variant={sevColor}>{intel.severity}</Badge>
      </div>

      {/* Headline */}
      <h3 className="text-sm font-bold text-slate-100 leading-snug mb-2 group-hover:text-white transition-colors">
        {intel.headline}
      </h3>

      {/* Description preview */}
      <p className="text-xs text-slate-400 leading-relaxed mb-3">
        {truncate(intel.creator_action, 120)}
      </p>

      {/* Footer metadata */}
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          {daysLeft !== null && daysLeft >= 0 && (
            <span className="flex items-center gap-1 text-amber-400/80">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {daysLeft}d
            </span>
          )}
          <span>{intel.region}</span>
        </div>
        <span>{age}</span>
      </div>
    </button>
  );
}

function BuilderCard({
  opp,
  onClick,
}: {
  opp: MarketOpportunity;
  onClick: () => void;
}) {
  const age = daysAgo(opp.first_detected);
  const trendColor = TREND_COLORS[opp.trend_direction] || TREND_COLORS.stable;
  const urgencyColor = SEVERITY_COLORS[opp.urgency] || SEVERITY_COLORS.low;

  return (
    <button
      onClick={onClick}
      className="group text-left w-full bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/50 hover:border-slate-600 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-slate-900/50 hover:-translate-y-0.5"
    >
      {/* Top row: trend + urgency */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant={trendColor}>📈 {opp.trend_direction}</Badge>
        <Badge variant={urgencyColor}>{opp.urgency}</Badge>
      </div>

      {/* Headline */}
      <h3 className="text-sm font-bold text-slate-100 leading-snug mb-2 group-hover:text-white transition-colors">
        {opp.pattern_name}
      </h3>

      {/* Description preview */}
      <p className="text-xs text-slate-400 leading-relaxed mb-3">
        {truncate(opp.product_opportunity, 120)}
      </p>

      {/* Footer metadata */}
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <span>🌍</span>
          <span>{opp.regions_affected.slice(0, 3).join(", ")}</span>
          {opp.regions_affected.length > 3 && (
            <span>+{opp.regions_affected.length - 3}</span>
          )}
        </div>
        <span>{age}</span>
      </div>
    </button>
  );
}

function Modal({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-end mb-2">
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function CreatorModal({ intel, signal }: { intel: CreatorIntel; signal: AgentSignal }) {
  const daysLeft = daysUntil(intel.deadline);
  const regionEmoji = REGION_EMOJI[intel.region] || "🌐";
  const typeLabel = SIGNAL_TYPE_LABELS[intel.signal_type] || intel.signal_type.toUpperCase();
  const typeColor = SIGNAL_TYPE_COLORS[intel.signal_type] || SIGNAL_TYPE_COLORS.baseline;
  const sevColor = SEVERITY_COLORS[intel.severity] || SEVERITY_COLORS.observational;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Badge variant={typeColor}>
          {regionEmoji} {typeLabel}
        </Badge>
        <Badge variant={sevColor}>{intel.severity}</Badge>
      </div>

      <h2 className="text-lg font-bold text-white mb-3">{intel.headline}</h2>

      <div className="space-y-4 text-sm text-slate-300">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">What Changed</h4>
          <p>{intel.what_changed}</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Creator Risk</h4>
          <p>{intel.creator_risk}</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Action Required</h4>
          <p className="text-slate-200">{intel.creator_action}</p>
        </div>

        {intel.deadline && (
          <div className="flex items-center gap-2 text-amber-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">
              Deadline: {intel.deadline}
              {daysLeft !== null && ` (${daysLeft} days remaining)`}
            </span>
          </div>
        )}

        {intel.content_format_at_risk.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Formats at Risk</h4>
            <div className="flex flex-wrap gap-1.5">
              {intel.content_format_at_risk.map((f) => (
                <span key={f} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded">
                  {f.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sources</h4>
          <div className="space-y-1">
            {intel.sources.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">{s.date_accessed}</span>
                <span className="text-slate-300">{s.name}</span>
                <span className="text-slate-600">({s.source_type})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 text-xs text-slate-600 border-t border-slate-800">
          Signal: {signal.signal_id} · {signal.date}
        </div>
      </div>
    </div>
  );
}

function BuilderModal({ opp }: { opp: MarketOpportunity }) {
  const trendColor = TREND_COLORS[opp.trend_direction] || TREND_COLORS.stable;
  const urgencyColor = SEVERITY_COLORS[opp.urgency] || SEVERITY_COLORS.low;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Badge variant={trendColor}>📈 {opp.trend_direction}</Badge>
        <Badge variant={urgencyColor}>{opp.urgency}</Badge>
      </div>

      <h2 className="text-lg font-bold text-white mb-3">{opp.pattern_name}</h2>

      <div className="space-y-4 text-sm text-slate-300">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</h4>
          <p>{opp.description}</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Product Opportunity</h4>
          <p className="text-slate-200">{opp.product_opportunity}</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Regions Affected</h4>
          <div className="flex flex-wrap gap-1.5">
            {opp.regions_affected.map((r) => (
              <span key={r} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded">
                {REGION_EMOJI[r] || "🌐"} {r}
              </span>
            ))}
          </div>
        </div>

        {opp.data_gaps.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Data Gaps</h4>
            <ul className="list-disc list-inside text-slate-400">
              {opp.data_gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2 text-xs text-slate-600 border-t border-slate-800">
          First detected: {opp.first_detected} · Events: {opp.event_count}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function HomePage() {
  const [view, setView] = useState<"creator" | "builder">("creator");
  const [signals, setSignals] = useState<AgentSignal[]>([]);
  const [alerts, setAlerts] = useState<CreatorAlert[]>([]);
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<{ intel: CreatorIntel; signal: AgentSignal } | null>(null);
  const [selectedBuilder, setSelectedBuilder] = useState<MarketOpportunity | null>(null);

  // Fetch all data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [signalsRes, alertsRes, oppRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/archive/latest?limit=100`),
          fetch(`${API_BASE}/api/v1/creator/alerts`),
          fetch(`${API_BASE}/api/v1/market/opportunities`),
        ]);

        const signalsData = await signalsRes.json();
        const alertsData = await alertsRes.json();
        const oppData = await oppRes.json();

        setSignals(signalsData.signals || []);
        setAlerts(alertsData || []);
        setOpportunities(oppData || []);
      } catch (e) {
        setError("Failed to load data");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Archive filtering (client-side, no backend changes)
  const archiveDays = view === "creator" ? 7 : 14;
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - archiveDays);
    return d;
  }, [archiveDays]);

  // ─── Creator cards: flatten signals → creator_intelligence[] ───
  const creatorCards = useMemo(() => {
    const cards: { intel: CreatorIntel; signal: AgentSignal; sortKey: number }[] = [];

    for (const signal of signals) {
      const signalDate = new Date(signal.date || signal.submitted_at || "1970-01-01");
      if (signalDate < cutoffDate) continue;

      for (const intel of signal.creator_intelligence || []) {
        const daysLeft = daysUntil(intel.deadline) ?? 999;
        const sev = SEVERITY_ORDER[intel.severity] ?? 99;
        const age = Math.floor((Date.now() - signalDate.getTime()) / (1000 * 60 * 60 * 24));

        // Sort: Deadline → Severity → Age
        const sortKey = daysLeft * 10000 + sev * 100 + age;
        cards.push({ intel, signal, sortKey });
      }
    }

    cards.sort((a, b) => a.sortKey - b.sortKey);
    return cards;
  }, [signals, cutoffDate]);

  // ─── Builder cards: use opportunities endpoint ───
  const builderCards = useMemo(() => {
    return opportunities
      .filter((opp) => {
        const d = new Date(opp.first_detected || "1970-01-01");
        return d >= cutoffDate;
      })
      .sort((a, b) => {
        const trendA = TREND_ORDER[a.trend_direction] ?? 99;
        const trendB = TREND_ORDER[b.trend_direction] ?? 99;
        const urgA = URGENCY_ORDER[a.urgency] ?? 99;
        const urgB = URGENCY_ORDER[b.urgency] ?? 99;
        // Sort: Trend → Urgency
        return trendA - trendB || urgA - urgB;
      });
  }, [opportunities, cutoffDate]);

  // Stats
  const stats = useMemo(() => {
    if (view === "creator") {
      const total = creatorCards.length;
      const criticalHigh = creatorCards.filter(
        (c) => c.intel.severity === "critical" || c.intel.severity === "high"
      ).length;
      const withDeadline = creatorCards.filter((c) => c.intel.deadline).length;
      const regions = new Set(creatorCards.map((c) => c.intel.region)).size;
      return { total, criticalHigh, withDeadline, regions };
    } else {
      const total = builderCards.length;
      const highUrgency = builderCards.filter(
        (o) => o.urgency === "critical" || o.urgency === "high"
      ).length;
      const strengthening = builderCards.filter((o) => o.trend_direction === "strengthening").length;
      const allRegions = new Set<string>();
      builderCards.forEach((o) => o.regions_affected.forEach((r) => allRegions.add(r)));
      return { total, criticalHigh: highUrgency, withDeadline: strengthening, regions: allRegions.size };
    }
  }, [creatorCards, builderCards, view]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Creator Aggregator</h1>
              <p className="text-xs text-slate-500 mt-0.5">Agent-Powered Trend Intelligence</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700/50 rounded-lg p-0.5">
              <button
                onClick={() => setView("creator")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  view === "creator"
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Creator
              </button>
              <button
                onClick={() => setView("builder")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  view === "builder"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Builder
              </button>
            </div>
          </div>

          {/* Compact stats bar */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-300 font-semibold">{stats.total}</span>
            <span className="text-slate-600">{view === "creator" ? "alerts" : "opportunities"}</span>
            <span className="text-slate-700">·</span>
            <span className="text-rose-400 font-medium">{stats.criticalHigh}</span>
            <span className="text-slate-600">{view === "creator" ? "critical/high" : "high urgency"}</span>
            <span className="text-slate-700">·</span>
            <span className="text-amber-400 font-medium">{stats.withDeadline}</span>
            <span className="text-slate-600">{view === "creator" ? "with deadlines" : "strengthening"}</span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-400 font-medium">{stats.regions}</span>
            <span className="text-slate-600">regions</span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-600">last {archiveDays} days</span>
          </div>
        </div>
      </header>

      {/* Card Grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {view === "creator" ? (
          creatorCards.length === 0 ? (
            <div className="text-center text-slate-600 text-sm py-20">No alerts in the last {archiveDays} days</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {creatorCards.map(({ intel, signal }, idx) => (
                <CreatorCard
                  key={`${signal.signal_id}-${intel.region}-${idx}`}
                  intel={intel}
                  signal={signal}
                  onClick={() => setSelectedCreator({ intel, signal })}
                />
              ))}
            </div>
          )
        ) : builderCards.length === 0 ? (
          <div className="text-center text-slate-600 text-sm py-20">No opportunities in the last {archiveDays} days</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {builderCards.map((opp) => (
              <BuilderCard
                key={opp.opportunity_id}
                opp={opp}
                onClick={() => setSelectedBuilder(opp)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <Modal isOpen={!!selectedCreator} onClose={() => setSelectedCreator(null)}>
        {selectedCreator && <CreatorModal intel={selectedCreator.intel} signal={selectedCreator.signal} />}
      </Modal>

      <Modal isOpen={!!selectedBuilder} onClose={() => setSelectedBuilder(null)}>
        {selectedBuilder && <BuilderModal opp={selectedBuilder} />}
      </Modal>
    </div>
  );
}
