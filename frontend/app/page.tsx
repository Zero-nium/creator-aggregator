"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   TYPES
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

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", dot: "bg-red-500" },
  high:     { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", dot: "bg-orange-500" },
  medium:   { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-500" },
  low:      { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", dot: "bg-blue-500" },
  observational: { bg: "bg-slate-700/50", text: "text-slate-400", border: "border-slate-600/30", dot: "bg-slate-500" },
};

const TREND_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  strengthening: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-500" },
  stable:       { bg: "bg-slate-700/50", text: "text-slate-400", border: "border-slate-600/30", dot: "bg-slate-500" },
  weakening:    { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", dot: "bg-rose-500" },
};

const REGION_EMOJI: Record<string, string> = {
  Australia: "🇦🇺", Japan: "🇯🇵", Indonesia: "🇮🇩",
  "South Korea": "🇰🇷", India: "🇮🇳", China: "🇨🇳",
  Singapore: "🇸🇬", Thailand: "🇹🇭", Vietnam: "🇻🇳",
  Philippines: "🇵🇭", Malaysia: "🇲🇾", "New Zealand": "🇳🇿",
};

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  regulatory_enforcement: "Regulation",
  platform_policy: "Platform",
  compliance_deadline: "Deadline",
  media_escalation: "Media",
  creator_sentiment: "Sentiment",
  baseline: "Baseline",
};

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  return Math.ceil((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function timeAgo(dateStr: string): string {
  const days = daysSince(dateStr);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

type ViewMode = "creator" | "builder";

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("creator");
  const [signals, setSignals] = useState<AgentSignal[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string>("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<any>(null);
  const [modalType, setModalType] = useState<"alert" | "opportunity" | null>(null);

  /* ─── Fetch data ─── */
  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);
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

  /* ─── Archive filtering ─── */
  const creatorSignals = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    return signals.filter(s => s.date >= cutoff);
  }, [signals]);

  const builderSignals = useMemo(() => {
    const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
    return signals.filter(s => s.date >= cutoff);
  }, [signals]);

  /* ─── Creator cards: flatten intelligence ─── */
  const creatorCards = useMemo(() => {
    const cards: any[] = [];
    creatorSignals.forEach(sig => {
      sig.creator_intelligence.forEach((intel, idx) => {
        const daysToDeadline = intel.deadline ? daysUntil(intel.deadline) : Infinity;
        cards.push({
          id: `${sig.signal_id}_${idx}`,
          signal_id: sig.signal_id,
          date: sig.date,
          age: daysSince(sig.date),
          ...intel,
          daysToDeadline,
          sortKey: [daysToDeadline === Infinity ? 999 : daysToDeadline, SEVERITY_ORDER[intel.severity], daysSince(sig.date)],
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

  /* ─── Builder cards: flatten opportunities ─── */
  const builderCards = useMemo(() => {
    const cards: any[] = [];
    builderSignals.forEach(sig => {
      sig.market_intelligence.consolidation_signals.forEach((consol, idx) => {
        cards.push({
          id: `${sig.signal_id}_c_${idx}`,
          signal_id: sig.signal_id,
          date: sig.date,
          age: daysSince(sig.date),
          ...consol,
          sortKey: [TREND_ORDER[consol.trend_direction], URGENCY_ORDER[consol.urgency]],
        });
      });
      sig.market_intelligence.arbitrage_signals.forEach((arb, idx) => {
        cards.push({
          id: `${sig.signal_id}_a_${idx}`,
          signal_id: sig.signal_id,
          date: sig.date,
          age: daysSince(sig.date),
          ...arb,
          isArbitrage: true,
          sortKey: [3, 3],
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
    <main className="min-h-screen bg-[#0a0e1a] text-slate-200">
      {/* ═══════ HEADER ═══════ */}
      <header className="border-b border-slate-800/60 bg-[#0f1420]">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Creator Aggregator</h1>
              <p className="mt-0.5 text-sm text-slate-500">Agent-Powered Trend Intelligence</p>
            </div>
            <div className="flex items-center gap-4">
              {/* View toggle */}
              <div className="flex rounded-lg bg-slate-800/60 p-0.5">
                <button
                  onClick={() => setViewMode("creator")}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                    viewMode === "creator"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Creator
                </button>
                <button
                  onClick={() => setViewMode("builder")}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                    viewMode === "builder"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Builder
                </button>
              </div>
              <div className="text-right text-xs text-slate-600">
                <div className="text-slate-400 font-medium">{stats?.total_signals ?? 0} signals</div>
                <div>{lastFetch}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
            Loading intelligence…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-300 text-sm">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {/* ═══════ CREATOR VIEW ═══════ */}
        {viewMode === "creator" && !loading && (
          <div className="space-y-6">
            {/* Compact stats bar */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{creatorCards.length}</span>
                <span className="text-slate-500">alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-400">{creatorCards.filter(c => c.severity === "critical" || c.severity === "high").length}</span>
                <span className="text-slate-500">critical/high</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-amber-400">{creatorCards.filter(c => c.deadline).length}</span>
                <span className="text-slate-500">with deadlines</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-emerald-400">{new Set(creatorCards.map(c => c.region)).size}</span>
                <span className="text-slate-500">regions</span>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 border-b border-slate-800/60 pb-3">
              <TabBadge label="All Alerts" count={creatorCards.length} active />
              <TabBadge label="Deadlines" count={creatorCards.filter(c => c.deadline).length} />
              <TabBadge label="Critical" count={creatorCards.filter(c => c.severity === "critical").length} />
              <TabBadge label="High" count={creatorCards.filter(c => c.severity === "high").length} />
            </div>

            {/* Card Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {creatorCards.map((card) => {
                const style = SEVERITY_STYLES[card.severity] || SEVERITY_STYLES.observational;
                return (
                  <div
                    key={card.id}
                    onClick={() => openAlertModal(card)}
                    className="group cursor-pointer rounded-xl border border-slate-800/60 bg-[#111827] p-5 hover:border-slate-700 hover:bg-[#161f2e] transition-all duration-200"
                  >
                    {/* Card header: emoji + type badge + severity */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{REGION_EMOJI[card.region] || "🌏"}</span>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          {SIGNAL_TYPE_LABELS[card.signal_type] || card.signal_type}
                        </span>
                      </div>
                      <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {card.severity}
                      </span>
                    </div>

                    {/* Headline */}
                    <h3 className="mt-3 text-[15px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors">
                      {card.headline}
                    </h3>

                    {/* Action preview */}
                    <p className="mt-2 text-sm text-slate-400 leading-relaxed line-clamp-2">
                      {card.creator_action}
                    </p>

                    {/* Footer meta */}
                    <div className="mt-4 flex items-center justify-between text-[11px] text-slate-600">
                      <div className="flex items-center gap-2">
                        {card.deadline && (
                          <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${
                            card.daysToDeadline <= 7 ? "bg-red-500/10 text-red-400" :
                            card.daysToDeadline <= 30 ? "bg-amber-500/10 text-amber-400" :
                            "bg-emerald-500/10 text-emerald-400"
                          }`}>
                            ⏰ {card.daysToDeadline}d
                          </span>
                        )}
                        <span>{card.region}</span>
                      </div>
                      <span>{timeAgo(card.date)}</span>
                    </div>
                  </div>
                );
              })}
              {creatorCards.length === 0 && (
                <EmptyState message="No alerts in the last 7 days." />
              )}
            </div>
          </div>
        )}

        {/* ═══════ BUILDER VIEW ═══════ */}
        {viewMode === "builder" && !loading && (
          <div className="space-y-6">
            {/* Compact stats bar */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{builderCards.length}</span>
                <span className="text-slate-500">opportunities</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-emerald-400">{builderCards.filter(c => !c.isArbitrage && c.trend_direction === "strengthening").length}</span>
                <span className="text-slate-500">strengthening</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-amber-400">{builderCards.filter(c => c.isArbitrage).length}</span>
                <span className="text-slate-500">arbitrage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-indigo-400">{new Set(builderCards.flatMap(c => c.regions_affected || [])).size}</span>
                <span className="text-slate-500">markets</span>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 border-b border-slate-800/60 pb-3">
              <TabBadge label="All Opportunities" count={builderCards.length} active />
              <TabBadge label="Consolidation" count={builderCards.filter(c => !c.isArbitrage).length} />
              <TabBadge label="Arbitrage" count={builderCards.filter(c => c.isArbitrage).length} />
            </div>

            {/* Card Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {builderCards.map((card) => {
                if (card.isArbitrage) {
                  return (
                    <div
                      key={card.id}
                      onClick={() => openOpportunityModal(card)}
                      className="group cursor-pointer rounded-xl border border-slate-800/60 bg-[#111827] p-5 hover:border-slate-700 hover:bg-[#161f2e] transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">💡</span>
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                          Arbitrage
                        </span>
                      </div>
                      <h3 className="mt-3 text-[15px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-emerald-300 transition-colors">
                        {card.opportunity}
                      </h3>
                      <p className="mt-2 text-sm text-slate-400 leading-relaxed line-clamp-3">
                        {card.description}
                      </p>
                      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-600">
                        <div className="flex gap-1">
                          {card.regions_affected?.slice(0, 3).map((r: string) => (
                            <span key={r} className="text-slate-500">{REGION_EMOJI[r] || "🌏"}</span>
                          ))}
                        </div>
                        <span>{timeAgo(card.date)}</span>
                      </div>
                    </div>
                  );
                }

                const style = TREND_STYLES[card.trend_direction] || TREND_STYLES.stable;
                return (
                  <div
                    key={card.id}
                    onClick={() => openOpportunityModal(card)}
                    className="group cursor-pointer rounded-xl border border-slate-800/60 bg-[#111827] p-5 hover:border-slate-700 hover:bg-[#161f2e] transition-all duration-200"
                  >
                    {/* Header: trend badge + urgency */}
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {card.trend_direction}
                      </span>
                      <span className={`text-[11px] font-medium uppercase ${URGENCY_ORDER[card.urgency] <= 1 ? "text-red-400" : "text-slate-500"}`}>
                        {card.urgency}
                      </span>
                    </div>

                    {/* Pattern name */}
                    <h3 className="mt-3 text-[15px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-emerald-300 transition-colors">
                      {card.pattern}
                    </h3>

                    {/* Description */}
                    <p className="mt-2 text-sm text-slate-400 leading-relaxed line-clamp-3">
                      {card.description}
                    </p>

                    {/* Product opportunity preview */}
                    <div className="mt-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                      <div className="text-[10px] font-semibold text-emerald-500/70 uppercase tracking-wider">Product Opportunity</div>
                      <div className="mt-1 text-xs text-emerald-300/80 line-clamp-2">{card.product_opportunity}</div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between text-[11px] text-slate-600">
                      <div className="flex gap-1">
                        {card.regions_affected?.slice(0, 3).map((r: string) => (
                          <span key={r} className="text-slate-500">{REGION_EMOJI[r] || "🌏"}</span>
                        ))}
                      </div>
                      <span>{card.event_count} events · {timeAgo(card.date)}</span>
                    </div>
                  </div>
                );
              })}
              {builderCards.length === 0 && (
                <EmptyState message="No opportunities in the last 14 days." />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
         MODAL
         ═══════════════════════════════════════════════════════════════ */}
      {modalOpen && modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/50 bg-[#0f1420] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{REGION_EMOJI[modalContent.region || modalContent.regions_affected?.[0]] || "🌏"}</span>
                <div>
                  {modalType === "alert" && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border ${SEVERITY_STYLES[modalContent.severity]?.bg} ${SEVERITY_STYLES[modalContent.severity]?.text} ${SEVERITY_STYLES[modalContent.severity]?.border}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_STYLES[modalContent.severity]?.dot}`} />
                      {modalContent.severity}
                    </span>
                  )}
                  {modalType === "opportunity" && !modalContent.isArbitrage && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border ${TREND_STYLES[modalContent.trend_direction]?.bg} ${TREND_STYLES[modalContent.trend_direction]?.text} ${TREND_STYLES[modalContent.trend_direction]?.border}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${TREND_STYLES[modalContent.trend_direction]?.dot}`} />
                      {modalContent.trend_direction}
                    </span>
                  )}
                  <div className="mt-1 text-xs text-slate-600">
                    {modalContent.region || modalContent.regions_affected?.join(", ")} · {modalContent.date}
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <h2 className="mt-5 text-xl font-bold text-white leading-snug">
              {modalContent.headline || modalContent.pattern || modalContent.opportunity}
            </h2>

            {modalType === "alert" && (
              <div className="mt-5 space-y-5">
                <Section label="What Changed" text={modalContent.what_changed} />
                <Section label="Creator Risk" text={modalContent.creator_risk} className="text-red-300" />
                <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-4">
                  <div className="text-[11px] font-semibold text-indigo-400/70 uppercase tracking-wider">Action Required</div>
                  <p className="mt-1.5 text-sm text-indigo-200 leading-relaxed">{modalContent.creator_action}</p>
                </div>
                {modalContent.deadline && (
                  <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    modalContent.daysToDeadline <= 7 ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    modalContent.daysToDeadline <= 30 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}>
                    ⏰ Deadline: {modalContent.deadline} ({modalContent.daysToDeadline} days remaining)
                  </div>
                )}
                {modalContent.content_format_at_risk?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Formats at Risk</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {modalContent.content_format_at_risk.map((f: string) => (
                        <span key={f} className="rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 border border-slate-700/30">{f.replace(/_/g, " ")}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sources</div>
                  <div className="mt-2 space-y-1.5">
                    {modalContent.sources?.map((s: SignalSource, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                        {s.name} · <span className="text-slate-600">{s.source_type}</span> · {s.date_accessed}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {modalType === "opportunity" && (
              <div className="mt-5 space-y-5">
                <Section label="Description" text={modalContent.description} />
                {!modalContent.isArbitrage && (
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-4">
                    <div className="text-[11px] font-semibold text-emerald-500/70 uppercase tracking-wider">Product Opportunity</div>
                    <p className="mt-1.5 text-sm text-emerald-200 leading-relaxed">{modalContent.product_opportunity}</p>
                  </div>
                )}
                {modalContent.isArbitrage && (
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4">
                    <div className="text-[11px] font-semibold text-amber-500/70 uppercase tracking-wider">Arbitrage Opportunity</div>
                    <p className="mt-1.5 text-sm text-amber-200 leading-relaxed">{modalContent.opportunity}</p>
                  </div>
                )}
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Regions Affected</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {modalContent.regions_affected?.map((r: string) => (
                      <span key={r} className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 border border-slate-700/30">
                        {REGION_EMOJI[r] || "🌏"} {r}
                      </span>
                    ))}
                  </div>
                </div>
                {modalContent.data_gap && (
                  <Section label="Data Gap" text={modalContent.data_gap} />
                )}
                {!modalContent.isArbitrage && (
                  <div className="flex gap-6 text-xs text-slate-600">
                    <span>{modalContent.event_count} events tracked</span>
                    <span>First detected: {modalContent.first_detected}</span>
                  </div>
                )}
              </div>
            )}

            {/* Modal footer */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={closeModal}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
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

function TabBadge({ label, count, active = false }: { label: string; count: number; active?: boolean }) {
  return (
    <button
      className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-slate-800 text-white"
          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
      }`}
    >
      {label}
      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${active ? "bg-slate-700 text-slate-300" : "bg-slate-800/60 text-slate-600"}`}>
        {count}
      </span>
    </button>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-[#111827] p-5">
      <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full rounded-xl border border-slate-800/40 bg-[#111827]/50 p-12 text-center text-slate-600 text-sm">
      {message}
    </div>
  );
}

function Section({ label, text, className = "text-slate-300" }: { label: string; text: string; className?: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      <p className={`mt-1.5 text-sm leading-relaxed ${className}`}>{text}</p>
    </div>
  );
}
