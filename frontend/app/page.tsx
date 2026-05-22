"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   TYPES — Backend Schema v1.2.0
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

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const API_BASE = "https://agent-dashboard-api-windblown-fog-6023.fly.dev/api/v1";

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, observational: 4 };
const TREND_ORDER = { strengthening: 0, stable: 1, weakening: 2 };
const URGENCY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

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

const TREND_BG: Record<string, string> = {
  strengthening: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  stable: "bg-slate-700 text-slate-300 border-slate-600",
  weakening: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

const REGION_EMOJI: Record<string, string> = {
  Australia: "🇦🇺",
  Japan: "🇯🇵",
  Indonesia: "🇮🇩",
  "South Korea": "🇰🇷",
  India: "🇮🇳",
};

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

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

  const [signals, setSignals] = useState<AgentSignal[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string>("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<any>(null);
  const [modalType, setModalType] = useState<"alert" | "opportunity" | "pattern" | null>(null);

  /* ─── Fetch data with archive filtering ─── */
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);

        // Creator: 7 days, Builder: 14 days
        const creatorSince = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
        const builderSince = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];

        const [sigRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/archive/latest?limit=200`),
          fetch(`${API_BASE}/stats`),
        ]);

        if (!cancelled) {
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
  const creatorSignals = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    return signals.filter(s => s.date >= cutoff);
  }, [signals]);

  const builderSignals = useMemo(() => {
    const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
    return signals.filter(s => s.date >= cutoff);
  }, [signals]);

  // Creator: flatten intelligence into alert cards
  const alertCards = useMemo(() => {
    const cards: any[] = [];
    creatorSignals.forEach(sig => {
      sig.creator_intelligence.forEach((intel, idx) => {
        const daysToDeadline = intel.deadline ? daysUntil(intel.deadline) : Infinity;
        const age = daysSince(sig.date);
        cards.push({
          id: `${sig.signal_id}_${idx}`,
          signal_id: sig.signal_id,
          date: sig.date,
          age,
          ...intel,
          daysToDeadline,
          sortKey: [daysToDeadline === Infinity ? 999 : daysToDeadline, SEVERITY_ORDER[intel.severity], age],
        });
      });
    });
    return cards.sort((a, b) => {
      for (let i = 0; i < a.sortKey.length; i++) {
        if (a.sortKey[i] !== b.sortKey[i]) return a.sortKey[i] - b.sortKey[i];
      }
      return 0;
    });
  }, [creatorSignals]);

  // Builder: flatten opportunities
  const opportunityCards = useMemo(() => {
    const cards: any[] = [];
    builderSignals.forEach(sig => {
      sig.market_intelligence.consolidation_signals.forEach((consol, idx) => {
        cards.push({
          id: `${sig.signal_id}_consol_${idx}`,
          signal_id: sig.signal_id,
          date: sig.date,
          age: daysSince(sig.date),
          ...consol,
          sortKey: [TREND_ORDER[consol.trend_direction], URGENCY_ORDER[consol.urgency]],
        });
      });
      sig.market_intelligence.arbitrage_signals.forEach((arb, idx) => {
        cards.push({
          id: `${sig.signal_id}_arb_${idx}`,
          signal_id: sig.signal_id,
          date: sig.date,
          age: daysSince(sig.date),
          ...arb,
          isArbitrage: true,
          sortKey: [2, 2], // arbitrage last
        });
      });
    });
    return cards.sort((a, b) => {
      for (let i = 0; i < a.sortKey.length; i++) {
        if (a.sortKey[i] !== b.sortKey[i]) return a.sortKey[i] - b.sortKey[i];
      }
      return 0;
    });
  }, [builderSignals]);

  /* ─── Modal handlers ─── */
  const openAlertModal = (card: any) => {
    setModalContent(card);
    setModalType("alert");
    setModalOpen(true);
  };

  const openOpportunityModal = (card: any) => {
    setModalContent(card);
    setModalType("opportunity");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalContent(null);
    setModalType(null);
  };

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
            {/* Stats row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Alerts" value={alertCards.length} color="#6366f1" />
              <StatCard label="Critical/High" value={alertCards.filter(a => a.severity === "critical" || a.severity === "high").length} color="#ef4444" />
              <StatCard label="With Deadlines" value={alertCards.filter(a => a.deadline).length} color="#f59e0b" />
              <StatCard label="Regions Covered" value={new Set(alertCards.map(a => a.region)).size} color="#10b981" />
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
                  {tab === "alerts" && <span className="ml-1 text-xs text-slate-500">({alertCards.length})</span>}
                  {tab === "deadlines" && <span className="ml-1 text-xs text-slate-500">({alertCards.filter(a => a.deadline).length})</span>}
                  {tab === "signals" && <span className="ml-1 text-xs text-slate-500">({creatorSignals.length})</span>}
                </button>
              ))}
            </div>

            {/* Alerts tab — CARD GRID */}
            {creatorTab === "alerts" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {alertCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => openAlertModal(card)}
                    className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-600 hover:bg-slate-800/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-2xl">{REGION_EMOJI[card.region] || "🌏"}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${SEVERITY_BG[card.severity] || SEVERITY_BG.observational}`}>
                        {card.severity.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-white line-clamp-2">{card.headline}</h3>
                    <p className="mt-2 text-xs text-slate-400 line-clamp-3">{card.creator_action}</p>
                    {card.deadline && (
                      <div className={`mt-3 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
                        card.daysToDeadline <= 7 ? "bg-red-500/10 text-red-300" : card.daysToDeadline <= 30 ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"
                      }`}>
                        ⏰ {card.daysToDeadline} days
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {card.content_format_at_risk.slice(0, 3).map((f: string) => (
                        <span key={f} className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{f.replace(/_/g, " ")}</span>
                      ))}
                    </div>
                    <div className="mt-3 text-[10px] text-slate-600">{card.age}d ago · {card.region}</div>
                  </div>
                ))}
                {alertCards.length === 0 && <EmptyState message="No alerts in the last 7 days." />}
              </div>
            )}

            {/* Deadlines tab */}
            {creatorTab === "deadlines" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {alertCards
                  .filter((a) => a.deadline)
                  .sort((a, b) => a.daysToDeadline - b.daysToDeadline)
                  .map((card) => (
                    <div
                      key={card.id}
                      onClick={() => openAlertModal(card)}
                      className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-600 hover:bg-slate-800/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{REGION_EMOJI[card.region] || "🌏"}</span>
                        <span className={`text-2xl font-bold ${card.daysToDeadline <= 7 ? "text-red-400" : card.daysToDeadline <= 30 ? "text-amber-400" : "text-emerald-400"}`}>
                          {card.daysToDeadline}
                        </span>
                      </div>
                      <div className="mt-1 text-right text-xs text-slate-500">days left</div>
                      <h3 className="mt-3 text-sm font-semibold text-white line-clamp-2">{card.headline}</h3>
                      <div className="mt-3 rounded-lg bg-slate-800/50 p-2 text-xs text-slate-300 line-clamp-3">
                        {card.creator_action}
                      </div>
                      <div className="mt-3 text-[10px] text-slate-600">Due: {card.deadline}</div>
                    </div>
                  ))}
                {alertCards.filter((a) => a.deadline).length === 0 && <EmptyState message="No upcoming deadlines." />}
              </div>
            )}

            {/* Signals tab (raw) */}
            {creatorTab === "signals" && (
              <div className="space-y-3">
                {creatorSignals.map((sig) => (
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
                {creatorSignals.length === 0 && <EmptyState message="No signals in the last 7 days." />}
              </div>
            )}
          </div>
        )}

        {/* ═══════ BUILDER VIEW ═══════ */}
        {viewMode === "builder" && !loading && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Opportunities" value={opportunityCards.length} color="#10b981" />
              <StatCard label="Consolidation" value={opportunityCards.filter(o => !o.isArbitrage).length} color="#6366f1" />
              <StatCard label="Arbitrage" value={opportunityCards.filter(o => o.isArbitrage).length} color="#f59e0b" />
              <StatCard label="Markets" value={new Set(opportunityCards.flatMap(o => o.regions_affected)).size} color="#ec4899" />
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
                  {tab === "opportunities" && <span className="ml-1 text-xs text-slate-500">({opportunityCards.length})</span>}
                  {tab === "signals" && <span className="ml-1 text-xs text-slate-500">({builderSignals.length})</span>}
                </button>
              ))}
            </div>

            {/* Opportunities tab — CARD GRID */}
            {builderTab === "opportunities" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {opportunityCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => openOpportunityModal(card)}
                    className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-600 hover:bg-slate-800/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-2xl">{card.isArbitrage ? "💡" : "🔥"}</span>
                      {!card.isArbitrage && (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${TREND_BG[card.trend_direction] || TREND_BG.stable}`}>
                          {card.trend_direction}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-white line-clamp-2">
                      {card.isArbitrage ? card.opportunity : card.pattern}
                    </h3>
                    <p className="mt-2 text-xs text-slate-400 line-clamp-3">
                      {card.description}
                    </p>
                    {!card.isArbitrage && (
                      <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
                        <div className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Product Opportunity</div>
                        <div className="mt-1 text-xs text-emerald-200 line-clamp-2">{card.product_opportunity}</div>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {card.regions_affected.slice(0, 3).map((r: string) => (
                        <span key={r} className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                          {REGION_EMOJI[r] || "🌏"} {r}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 text-[10px] text-slate-600">{card.age}d ago · {card.event_count || 1} events</div>
                  </div>
                ))}
                {opportunityCards.length === 0 && <EmptyState message="No opportunities in the last 14 days." />}
              </div>
            )}

            {/* Patterns tab */}
            {builderTab === "patterns" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {builderSignals.flatMap((sig) =>
                  sig.market_intelligence.consolidation_signals.map((consol, i) => (
                    <div
                      key={`${sig.signal_id}_${i}`}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
                    >
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
                {builderSignals.flatMap((s) => s.market_intelligence.consolidation_signals).length === 0 && (
                  <EmptyState message="No consolidation patterns detected yet." />
                )}
              </div>
            )}

            {/* Signals tab (raw) */}
            {builderTab === "signals" && (
              <div className="space-y-3">
                {builderSignals.map((sig) => (
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
                {builderSignals.length === 0 && <EmptyState message="No signals in the last 14 days." />}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
         MODAL
         ═══════════════════════════════════════════════════════════════ */}
      {modalOpen && modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{REGION_EMOJI[modalContent.region || modalContent.regions_affected?.[0]] || "🌏"}</span>
                <div>
                  {modalType === "alert" && (
                    <span className={`rounded-full px-3 py-1 text-xs font-medium border ${SEVERITY_BG[modalContent.severity]}`}>
                      {modalContent.severity?.toUpperCase()}
                    </span>
                  )}
                  {modalType === "opportunity" && !modalContent.isArbitrage && (
                    <span className={`rounded-full px-3 py-1 text-xs font-medium border ${TREND_BG[modalContent.trend_direction]}`}>
                      {modalContent.trend_direction}
                    </span>
                  )}
                  <div className="mt-1 text-xs text-slate-500">
                    {modalContent.region || modalContent.regions_affected?.join(", ")} · {modalContent.date}
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <h2 className="mt-4 text-xl font-bold text-white">{modalContent.headline || modalContent.pattern || modalContent.opportunity}</h2>

            {modalType === "alert" && (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">What Changed</div>
                  <p className="mt-1 text-sm text-slate-300">{modalContent.what_changed}</p>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Creator Risk</div>
                  <p className="mt-1 text-sm text-red-300">{modalContent.creator_risk}</p>
                </div>
                <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-4">
                  <div className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Action Required</div>
                  <p className="mt-1 text-sm text-indigo-200">{modalContent.creator_action}</p>
                </div>
                {modalContent.deadline && (
                  <div className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                    modalContent.daysToDeadline <= 7 ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"
                  }`}>
                    ⏰ Deadline: {modalContent.deadline} ({modalContent.daysToDeadline} days remaining)
                  </div>
                )}
                {modalContent.content_format_at_risk?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Formats at Risk</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {modalContent.content_format_at_risk.map((f: string) => (
                        <span key={f} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{f.replace(/_/g, " ")}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sources</div>
                  <div className="mt-1 space-y-1">
                    {modalContent.sources?.map((s: SignalSource, i: number) => (
                      <div key={i} className="text-sm text-slate-400">
                        {s.name} · {s.source_type} · {s.date_accessed}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {modalType === "opportunity" && (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Description</div>
                  <p className="mt-1 text-sm text-slate-300">{modalContent.description}</p>
                </div>
                {!modalContent.isArbitrage && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                    <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Product Opportunity</div>
                    <p className="mt-1 text-sm text-emerald-200">{modalContent.product_opportunity}</p>
                  </div>
                )}
                {modalContent.isArbitrage && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                    <div className="text-xs font-medium text-amber-400 uppercase tracking-wider">Arbitrage Opportunity</div>
                    <p className="mt-1 text-sm text-amber-200">{modalContent.opportunity}</p>
                  </div>
                )}
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Regions Affected</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {modalContent.regions_affected?.map((r: string) => (
                      <span key={r} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        {REGION_EMOJI[r] || "🌏"} {r}
                      </span>
                    ))}
                  </div>
                </div>
                {modalContent.data_gap && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Data Gap</div>
                    <p className="mt-1 text-sm text-slate-400">{modalContent.data_gap}</p>
                  </div>
                )}
                {!modalContent.isArbitrage && (
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>{modalContent.event_count} events</span>
                    <span>First detected: {modalContent.first_detected}</span>
                  </div>
                )}
              </div>
            )}

            {/* Modal footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeModal}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
