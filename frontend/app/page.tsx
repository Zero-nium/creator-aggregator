"use client";

import React, { useEffect, useMemo, useState } from "react";

// ─── Types ───

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

interface MarketOpportunity {
  opportunity_id: string;
  pattern_name: string;
  regions_affected: string[];
  description: string;           // Problem
  product_opportunity: string;   // Opportunity
  solution?: string;              // Solution
  commercialisation?: string;      // Commercialisation
  urgency: string;
  data_gaps: string[];
  first_detected: string;
  trend_direction: string;
}

// ─── Window Size Hook ───

function useWindowSize() {
  const [size, setSize] = useState({ width: 1200, height: 800 });
  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
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
  critical: 0, high: 1, medium: 2, low: 3, observational: 4,
};

const URGENCY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

const TREND_ORDER: Record<string, number> = {
  strengthening: 0, stable: 1, weakening: 2,
};

// ─── Helpers ───

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch { return null; }
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
  } catch { return ""; }
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len).trim() + "…";
}

// ─── Styles (inline to bypass Tailwind compilation issues) ───

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundColor: "#f9fafb", color: "#111827", fontFamily: 'system-ui, -apple-system, sans-serif', overflowX: "hidden" },
  header: { borderBottom: "1px solid #e5e7eb", backgroundColor: "#ffffff" },
  headerInner: { maxWidth: "1152px", margin: "0 auto", padding: "16px 12px" },
  headerTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" },
  title: { fontSize: "20px", fontWeight: 700, color: "#111827", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.2 },
  subtitle: { fontSize: "12px", color: "#6b7280", marginTop: "4px", margin: 0 },
  toggleWrap: { display: "flex", alignItems: "center", gap: "2px", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "2px" },
  toggleBtn: { padding: "6px 12px", fontSize: "12px", fontWeight: 500, borderRadius: "6px", border: "none", cursor: "pointer", transition: "all 0.15s" },
  toggleBtnActiveCreator: { backgroundColor: "#ffffff", color: "#4338ca", border: "1px solid #c7d2fe", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  toggleBtnActiveBuilder: { backgroundColor: "#ffffff", color: "#047857", border: "1px solid #a7f3d0", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  toggleBtnInactive: { backgroundColor: "transparent", color: "#6b7280" },
  statsBar: { display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", flexWrap: "wrap", rowGap: "6px" },
  statsNum: { fontWeight: 600, color: "#111827" },
  statsLabel: { color: "#6b7280" },
  statsDot: { color: "#d1d5db" },
  statsAccentRed: { fontWeight: 500, color: "#dc2626" },
  statsAccentAmber: { fontWeight: 500, color: "#d97706" },
  statsAccentGray: { fontWeight: 500, color: "#374151" },
  main: { maxWidth: "1152px", margin: "0 auto", padding: "16px 12px" },
  grid: { display: "grid", gap: "16px" },

  emptyState: { textAlign: "center", color: "#6b7280", fontSize: "14px", padding: "80px 0" },
  loading: { minHeight: "100vh", backgroundColor: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: "14px" },
  error: { minHeight: "100vh", backgroundColor: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", fontSize: "14px" },
};

// ─── Badge Component ───

function Badge({ children, bg, text, border }: { children: React.ReactNode; bg: string; text: string; border: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em",
      textTransform: "uppercase", borderRadius: "4px", border: `1px solid ${border}`,
      backgroundColor: bg, color: text,
    }}>
      {children}
    </span>
  );
}

// ─── Creator Card ───

function CreatorCard({ intel, signal, onClick }: { intel: CreatorIntel; signal: AgentSignal; onClick: () => void }) {
  const daysLeft = daysUntil(intel.deadline);
  const age = daysAgo(signal.date || signal.submitted_at);
  const regionEmoji = REGION_EMOJI[intel.region] || "🌐";
  const typeLabel = SIGNAL_TYPE_LABELS[intel.signal_type] || intel.signal_type.toUpperCase();

  const typeStyles: Record<string, { bg: string; text: string; border: string }> = {
    regulatory_enforcement: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
    platform_policy: { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
    compliance_deadline: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
    media_escalation: { bg: "#e0f2fe", text: "#075985", border: "#bae6fd" },
    creator_sentiment: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
    baseline: { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
  };

  const sevStyles: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
    high: { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
    medium: { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
    low: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
    observational: { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb" },
  };

  const ts = typeStyles[intel.signal_type] || typeStyles.baseline;
  const ss = sevStyles[intel.severity] || sevStyles.observational;

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left", width: "100%", backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px",
        cursor: "pointer", transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#d1d5db";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e5e7eb";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <Badge bg={ts.bg} text={ts.text} border={ts.border}>{regionEmoji} {typeLabel}</Badge>
        <Badge bg={ss.bg} text={ss.text} border={ss.border}>{intel.severity}</Badge>
      </div>

      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111827", lineHeight: 1.4, marginBottom: "8px" }}>
        {intel.headline}
      </h3>

      <p style={{ fontSize: "12px", color: "#4b5563", lineHeight: 1.5, marginBottom: "12px" }}>
        {truncate(intel.creator_action, 120)}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#6b7280" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {daysLeft !== null && daysLeft >= 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#b45309" }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {daysLeft}d
            </span>
          )}
          <span>{intel.region}</span>
        </div>
        <span style={{ color: "#9ca3af" }}>{age}</span>
      </div>
    </button>
  );
}

// ─── Builder Card ───

function BuilderCard({ opp, onClick }: { opp: MarketOpportunity; onClick: () => void }) {
  const age = daysAgo(opp.first_detected);

  const trendStyles: Record<string, { bg: string; text: string; border: string }> = {
    strengthening: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
    stable: { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
    weakening: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  };

  const urgencyStyles: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
    high: { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
    medium: { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
    low: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  };

  const ts = trendStyles[opp.trend_direction] || trendStyles.stable;
  const us = urgencyStyles[opp.urgency] || urgencyStyles.low;

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left", width: "100%", backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px",
        cursor: "pointer", transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#d1d5db";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e5e7eb";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <Badge bg={ts.bg} text={ts.text} border={ts.border}>📈 {opp.trend_direction}</Badge>
        <Badge bg={us.bg} text={us.text} border={us.border}>{opp.urgency}</Badge>
      </div>

      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111827", lineHeight: 1.4, marginBottom: "8px" }}>
        {opp.pattern_name}
      </h3>

      <p style={{ fontSize: "12px", color: "#4b5563", lineHeight: 1.5, marginBottom: "12px" }}>
        {truncate(opp.product_opportunity, 120)}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#6b7280" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span>🌍</span>
          <span>{opp.regions_affected.slice(0, 3).join(", ")}</span>
          {opp.regions_affected.length > 3 && <span>+{opp.regions_affected.length - 3}</span>}
        </div>
        <span style={{ color: "#9ca3af" }}>{age}</span>
      </div>
    </button>
  );
}

// ─── Modal ───

function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px", maxWidth: "512px", width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
            <button onClick={onClose} style={{ color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

// ─── Creator Modal ───

function CreatorModal({ intel, signal }: { intel: CreatorIntel; signal: AgentSignal }) {
  const daysLeft = daysUntil(intel.deadline);
  const regionEmoji = REGION_EMOJI[intel.region] || "🌐";
  const typeLabel = SIGNAL_TYPE_LABELS[intel.signal_type] || intel.signal_type.toUpperCase();

  const typeStyles: Record<string, { bg: string; text: string; border: string }> = {
    regulatory_enforcement: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
    platform_policy: { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
    compliance_deadline: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
    media_escalation: { bg: "#e0f2fe", text: "#075985", border: "#bae6fd" },
    creator_sentiment: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
    baseline: { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
  };

  const sevStyles: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
    high: { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
    medium: { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
    low: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
    observational: { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb" },
  };

  const ts = typeStyles[intel.signal_type] || typeStyles.baseline;
  const ss = sevStyles[intel.severity] || sevStyles.observational;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <Badge bg={ts.bg} text={ts.text} border={ts.border}>{regionEmoji} {typeLabel}</Badge>
        <Badge bg={ss.bg} text={ss.text} border={ss.border}>{intel.severity}</Badge>
      </div>

      <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "12px" }}>{intel.headline}</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px", color: "#374151" }}>
        <div>
          <h4 style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>What Changed</h4>
          <p>{intel.what_changed}</p>
        </div>

        <div>
          <h4 style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Creator Risk</h4>
          <p>{intel.creator_risk}</p>
        </div>

        <div>
          <h4 style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Action Required</h4>
          <p style={{ color: "#111827" }}>{intel.creator_action}</p>
        </div>

        {intel.deadline && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b45309" }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ fontWeight: 600 }}>
              Deadline: {intel.deadline}{daysLeft !== null && ` (${daysLeft} days remaining)`}
            </span>
          </div>
        )}

        {intel.content_format_at_risk.length > 0 && (
          <div>
            <h4 style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Formats at Risk</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {intel.content_format_at_risk.map((f) => (
                <span key={f} style={{ padding: "2px 8px", backgroundColor: "#f3f4f6", color: "#4b5563", fontSize: "12px", borderRadius: "4px" }}>
                  {f.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Sources</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {intel.sources.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                <span style={{ color: "#9ca3af" }}>{s.date_accessed}</span>
                <span style={{ color: "#374151" }}>{s.name}</span>
                <span style={{ color: "#9ca3af" }}>({s.source_type})</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ paddingTop: "8px", fontSize: "12px", color: "#9ca3af", borderTop: "1px solid #f3f4f6" }}>
          Signal: {signal.signal_id} · {signal.date}
        </div>
      </div>
    </div>
  );
}

// ─── Builder Modal ───

function BuilderModal({ opp }: { opp: MarketOpportunity }) {
  const trendStyles: Record<string, { bg: string; text: string; border: string }> = {
    strengthening: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
    stable: { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
    weakening: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  };

  const urgencyStyles: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
    high: { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
    medium: { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
    low: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  };

  const ts = trendStyles[opp.trend_direction] || trendStyles.stable;
  const us = urgencyStyles[opp.urgency] || urgencyStyles.low;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <Badge bg={ts.bg} text={ts.text} border={ts.border}>📈 {opp.trend_direction}</Badge>
        <Badge bg={us.bg} text={us.text} border={us.border}>{opp.urgency}</Badge>
      </div>

      <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "12px" }}>{opp.pattern_name}</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px", color: "#374151" }}>
        <div>
          <h4 style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Description</h4>
          <p>{opp.description}</p>
        </div>

        <div>
          <h4 style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Product Opportunity</h4>
          <p style={{ color: "#111827" }}>{opp.product_opportunity}</p>
        </div>

        <div>
          <h4 style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Regions Affected</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {opp.regions_affected.map((r) => (
              <span key={r} style={{ padding: "2px 8px", backgroundColor: "#f3f4f6", color: "#4b5563", fontSize: "12px", borderRadius: "4px" }}>
                {REGION_EMOJI[r] || "🌐"} {r}
              </span>
            ))}
          </div>
        </div>

        {opp.data_gaps.length > 0 && (
          <div>
            <h4 style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Data Gaps</h4>
            <ul style={{ listStyle: "disc", paddingLeft: "16px", color: "#4b5563" }}>
              {opp.data_gaps.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          </div>
        )}

        <div style={{ paddingTop: "8px", fontSize: "12px", color: "#9ca3af", borderTop: "1px solid #f3f4f6" }}>
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
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<{ intel: CreatorIntel; signal: AgentSignal } | null>(null);
  const [selectedBuilder, setSelectedBuilder] = useState<MarketOpportunity | null>(null);
  const { width } = useWindowSize();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [signalsRes, oppRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/archive/latest?limit=100`),
          fetch(`${API_BASE}/api/v1/market/opportunities`),
        ]);

        const signalsData = await signalsRes.json();
        const oppData = await oppRes.json();

        setSignals(signalsData.signals || []);
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

  const archiveDays = view === "creator" ? 7 : 14;
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - archiveDays);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [archiveDays]);

  const creatorCards = useMemo(() => {
    const cards: { intel: CreatorIntel; signal: AgentSignal; sortKey: number }[] = [];
    for (const signal of signals) {
      const signalDate = new Date(signal.date || signal.submitted_at || "1970-01-01");
      signalDate.setHours(0, 0, 0, 0);
      if (signalDate < cutoffDate) continue;
      for (const intel of signal.creator_intelligence || []) {
        const daysLeft = daysUntil(intel.deadline) ?? 999;
        const sev = SEVERITY_ORDER[intel.severity] ?? 99;
        const age = Math.floor((Date.now() - signalDate.getTime()) / (1000 * 60 * 60 * 24));
        const sortKey = daysLeft * 10000 + sev * 100 + age;
        cards.push({ intel, signal, sortKey });
      }
    }
    cards.sort((a, b) => a.sortKey - b.sortKey);
    return cards;
  }, [signals, cutoffDate]);

  const builderCards = useMemo(() => {
    return opportunities
      .filter((opp) => {
        const d = new Date(opp.first_detected || "1970-01-01");
        d.setHours(0, 0, 0, 0);
        return d >= cutoffDate;
      })
      .sort((a, b) => {
        const trendA = TREND_ORDER[a.trend_direction] ?? 99;
        const trendB = TREND_ORDER[b.trend_direction] ?? 99;
        const urgA = URGENCY_ORDER[a.urgency] ?? 99;
        const urgB = URGENCY_ORDER[b.urgency] ?? 99;
        return trendA - trendB || urgA - urgB;
      });
  }, [opportunities, cutoffDate]);

  const stats = useMemo(() => {
    if (view === "creator") {
      const total = creatorCards.length;
      const criticalHigh = creatorCards.filter((c) => c.intel.severity === "critical" || c.intel.severity === "high").length;
      const withDeadline = creatorCards.filter((c) => c.intel.deadline).length;
      const regions = new Set(creatorCards.map((c) => c.intel.region)).size;
      return { total, criticalHigh, withDeadline, regions };
    } else {
      const total = builderCards.length;
      const highUrgency = builderCards.filter((o) => o.urgency === "critical" || o.urgency === "high").length;
      const strengthening = builderCards.filter((o) => o.trend_direction === "strengthening").length;
      const allRegions = new Set<string>();
      builderCards.forEach((o) => o.regions_affected.forEach((r) => allRegions.add(r)));
      return { total, criticalHigh: highUrgency, withDeadline: strengthening, regions: allRegions.size };
    }
  }, [creatorCards, builderCards, view]);

  if (loading) return <div style={styles.loading}>Loading…</div>;
  if (error) return <div style={styles.error}>{error}</div>;

  const cards = view === "creator" ? creatorCards : builderCards;
  const isEmpty = cards.length === 0;

  return (
    <div style={styles.page}>
      <style dangerouslySetInnerHTML={{__html: `
        .creator-grid {
          display: grid;
          gap: 16px;
        }
        @media (max-width: 639px) {
          .creator-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .creator-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 1024px) {
          .creator-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        .creator-page { overflow-x: hidden; }
      `}} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerTop}>
            <div>
              <h1 style={styles.title}>Creator Aggregator</h1>
              <p style={styles.subtitle}>Agent-Powered Trend Intelligence</p>
            </div>
            <div style={styles.toggleWrap}>
              <button
                onClick={() => setView("creator")}
                style={{
                  ...styles.toggleBtn,
                  ...(view === "creator" ? styles.toggleBtnActiveCreator : styles.toggleBtnInactive),
                }}
              >
                Creator
              </button>
              <button
                onClick={() => setView("builder")}
                style={{
                  ...styles.toggleBtn,
                  ...(view === "builder" ? styles.toggleBtnActiveBuilder : styles.toggleBtnInactive),
                }}
              >
                Builder
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div style={styles.statsBar}>
            <span style={styles.statsNum}>{stats.total}</span>
            <span style={styles.statsLabel}>{view === "creator" ? "alerts" : "opportunities"}</span>
            <span style={styles.statsDot}>·</span>
            <span style={styles.statsAccentRed}>{stats.criticalHigh}</span>
            <span style={styles.statsLabel}>{view === "creator" ? "critical/high" : "high urgency"}</span>
            <span style={styles.statsDot}>·</span>
            <span style={styles.statsAccentAmber}>{stats.withDeadline}</span>
            <span style={styles.statsLabel}>{view === "creator" ? "with deadlines" : "strengthening"}</span>
            <span style={styles.statsDot}>·</span>
            <span style={styles.statsAccentGray}>{stats.regions}</span>
            <span style={styles.statsLabel}>regions</span>
            <span style={styles.statsDot}>·</span>
            <span style={styles.statsLabel}>last {archiveDays} days</span>
          </div>
        </div>
      </header>

      {/* Card Grid — 3 columns, inline styles, guaranteed to work */}
      <main style={styles.main}>
        {isEmpty ? (
          <div style={styles.emptyState}>
            No {view === "creator" ? "alerts" : "opportunities"} in the last {archiveDays} days
          </div>
        ) : (
          <div className="creator-grid">
            {view === "creator"
              ? creatorCards.map(({ intel, signal }, idx) => (
                  <CreatorCard
                    key={`${signal.signal_id}-${intel.region}-${idx}`}
                    intel={intel}
                    signal={signal}
                    onClick={() => setSelectedCreator({ intel, signal })}
                  />
                ))
              : builderCards.map((opp) => (
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
