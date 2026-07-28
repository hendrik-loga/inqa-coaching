import { useState, useCallback } from "react";

// ─── Layout ───────────────────────────────────────────────────────────────────
const DW = 1200;
const LW = 130;  // left label column width
const RW = 230;  // right legend width
const CW = DW - LW - RW; // 840 content width

const R = {
  headerY: 0,   headerH: 72,
  stepY:   72,  stepH:   88,
  infoY:   160, infoH:   112,
  tool1Y:  272, tool1H:  98,
  tool2Y:  370, tool2H:  102,
  footerY: 472, footerH: 52,
};
const DH = R.footerY + R.footerH; // 524

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  darkBlue:   "#1a2744",
  green:      "#2d6a1e",
  greenLight: "#eef5eb",
  infoGreen:  "#3d6b32",
  shadow:     "#6b7280",
  toolsBg:    "#dde3ea",
  cream:      "#fefaf4",
  red:        "#c0003c",
  yellow:     "#b8860b",
};

const CONN = {
  leading:    { stroke: C.green,   dash: "none", w: 2.5, label: "führendes System" },
  manual:     { stroke: "#c89a00", dash: "8,4",  w: 2,   label: "manuelle Übergabe" },
  mediaBreak: { stroke: C.red,     dash: "6,4",  w: 2,   label: "Medienbruch / doppelte Erfassung" },
  shadow:     { stroke: "#9ca3af", dash: "4,4",  w: 1.5, label: "Schattenlösung" },
};

// ─── Default Data ─────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => `e${++_uid}`;

const DEFAULT = {
  title:    "Toollandschaft Tischlerei",
  subtitle: "Beispielhafte Visualisierung vom Kundenwunsch bis zur Abrechnung",
  motto:    "Weniger Brüche. Mehr Durchgängigkeit. Bessere Entscheidungen.",
  guideQuestions: [
    "Wo liegt die verbindliche Quelle?",
    "Wo entsteht Doppelarbeit?",
    "Welche Informationen müssen durchgängig fließen?",
  ],
  steps: [
    { id: "s1",  label: "Anfrage" },
    { id: "s2",  label: "Erstkontakt" },
    { id: "s3",  label: "Aufmaß" },
    { id: "s4",  label: "Entwurf" },
    { id: "s5",  label: "Kalkulation" },
    { id: "s6",  label: "Angebot" },
    { id: "s7",  label: "Auftrag" },
    { id: "s8",  label: "Arbeitsvorbereitung" },
    { id: "s9",  label: "Fertigung" },
    { id: "s10", label: "Montage" },
    { id: "s11", label: "Abrechnung" },
  ],
  infoObjects: [
    { id: "io1",  stepId: "s1",  label: "Kundendaten" },
    { id: "io2",  stepId: "s2",  label: "Bedarf /\nSkizze" },
    { id: "io3",  stepId: "s3",  label: "Maße /\nFotos" },
    { id: "io4",  stepId: "s4",  label: "3D-Entwurf /\nZeichnung" },
    { id: "io5",  stepId: "s5",  label: "Material /\nZeitansatz" },
    { id: "io6",  stepId: "s6",  label: "Angebots-\npreis" },
    { id: "io7",  stepId: "s7",  label: "Auftrags-\ndaten" },
    { id: "io8",  stepId: "s8",  label: "Stückliste /\nBeschläge /\nCNC-Daten" },
    { id: "io9",  stepId: "s9",  label: "Fertigungs-\nstatus" },
    { id: "io10", stepId: "s10", label: "Montageinfos /\nRestpunkte" },
    { id: "io11", stepId: "s11", label: "Zeiten /\nRechnung" },
  ],
  tools: [
    { id: "t1", label: "Telefon /\nE-Mail",   startStep: "s1",  endStep: "s2",  row: 1, style: "shadow",  hasLightning: false },
    { id: "t2", label: "OSD / ERP",           startStep: "s2",  endStep: "s4",  row: 1, style: "leading", hasLightning: false },
    { id: "t3", label: "Excel",               startStep: "s5",  endStep: "s8",  row: 1, style: "leading", hasLightning: true  },
    { id: "t4", label: "Zeiterfassung",       startStep: "s11", endStep: "s11", row: 1, style: "shadow",  hasLightning: false },
    { id: "t5", label: "Papiermappe",         startStep: "s1",  endStep: "s2",  row: 2, style: "shadow",  hasLightning: true  },
    { id: "t6", label: "Planwand",            startStep: "s2",  endStep: "s3",  row: 2, style: "shadow",  hasLightning: true  },
    { id: "t7", label: "Palette CAD",         startStep: "s4",  endStep: "s10", row: 2, style: "core",    hasLightning: false },
    { id: "t8", label: "WhatsApp",            startStep: "s11", endStep: "s11", row: 2, style: "shadow",  hasLightning: true  },
  ],
  connections: [
    { id: "c1",  fromInfoObject: "io1",  toTool: "t1",  type: "manual"     },
    { id: "c2",  fromInfoObject: "io1",  toTool: "t5",  type: "shadow"     },
    { id: "c3",  fromInfoObject: "io2",  toTool: "t2",  type: "leading"    },
    { id: "c4",  fromInfoObject: "io2",  toTool: "t5",  type: "shadow"     },
    { id: "c5",  fromInfoObject: "io3",  toTool: "t2",  type: "leading"    },
    { id: "c6",  fromInfoObject: "io3",  toTool: "t6",  type: "shadow"     },
    { id: "c7",  fromInfoObject: "io4",  toTool: "t2",  type: "manual"     },
    { id: "c8",  fromInfoObject: "io4",  toTool: "t7",  type: "leading"    },
    { id: "c9",  fromInfoObject: "io5",  toTool: "t3",  type: "leading"    },
    { id: "c10", fromInfoObject: "io5",  toTool: "t7",  type: "manual"     },
    { id: "c11", fromInfoObject: "io6",  toTool: "t3",  type: "mediaBreak" },
    { id: "c12", fromInfoObject: "io7",  toTool: "t3",  type: "mediaBreak" },
    { id: "c13", fromInfoObject: "io7",  toTool: "t7",  type: "leading"    },
    { id: "c14", fromInfoObject: "io8",  toTool: "t7",  type: "leading"    },
    { id: "c15", fromInfoObject: "io9",  toTool: "t7",  type: "leading"    },
    { id: "c16", fromInfoObject: "io10", toTool: "t7",  type: "leading"    },
    { id: "c17", fromInfoObject: "io11", toTool: "t4",  type: "manual"     },
    { id: "c18", fromInfoObject: "io11", toTool: "t8",  type: "shadow"     },
  ],
};

// ─── Layout helpers ───────────────────────────────────────────────────────────
function getLayout(data) {
  const N = data.steps.length;
  const colW = CW / N;
  const idx = (id) => data.steps.findIndex((s) => s.id === id);
  const colCX = (i) => LW + (i + 0.5) * colW;
  const infoCX = (io) => colCX(idx(io.stepId));
  const toolRect = (t) => {
    const si = idx(t.startStep), ei = idx(t.endStep);
    const pad = 4;
    return {
      x: LW + si * colW + pad,
      y: (t.row === 1 ? R.tool1Y : R.tool2Y) + pad,
      w: (ei - si + 1) * colW - 2 * pad,
      h: (t.row === 1 ? R.tool1H : R.tool2H) - 2 * pad,
    };
  };
  return { N, colW, idx, colCX, infoCX, toolRect };
}

// ─── SVG helpers ─────────────────────────────────────────────────────────────
function SvgText({ x, y, text, fontSize = 11, fill = "#1f2937", anchor = "middle", fontWeight = "normal", lineHeight = 14 }) {
  const lines = String(text).split("\n");
  const totalH = (lines.length - 1) * lineHeight;
  return (
    <text x={x} y={y - totalH / 2} textAnchor={anchor} fontSize={fontSize} fill={fill} fontWeight={fontWeight} fontFamily="system-ui,sans-serif">
      {lines.map((ln, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight}>{ln}</tspan>
      ))}
    </text>
  );
}

function Lightning({ cx, cy, size = 12 }) {
  return (
    <g transform={`translate(${cx - size / 2},${cy - size / 2})`}>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={C.red} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={10} fill="#fff" fontWeight="bold">⚡</text>
    </g>
  );
}

// ─── Diagram SVG ─────────────────────────────────────────────────────────────
function DiagramSVG({ data }) {
  const { N, colW, idx, colCX, infoCX, toolRect } = getLayout(data);

  // Build connection paths
  const connPaths = data.connections.map((conn) => {
    const io = data.infoObjects.find((o) => o.id === conn.fromInfoObject);
    const tool = data.tools.find((t) => t.id === conn.toTool);
    if (!io || !tool) return null;
    const x1 = infoCX(io);
    const y1 = R.infoY + R.infoH;
    const rect = toolRect(tool);
    const x2 = rect.x + rect.w / 2;
    const y2 = rect.y;
    const cy = (y1 + y2) / 2;
    return { id: conn.id, d: `M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`, type: conn.type };
  }).filter(Boolean);

  return (
    <svg
      id="tool-landscape-svg"
      viewBox={`0 0 ${DW} ${DH}`}
      style={{ width: "100%", display: "block", fontFamily: "system-ui,sans-serif" }}
    >
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={C.darkBlue} />
        </marker>
        <marker id="arr-sm" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill={C.darkBlue} opacity="0.5" />
        </marker>
      </defs>

      {/* ── Background ── */}
      <rect x={0} y={0} width={DW} height={DH} fill={C.cream} />

      {/* ── Header ── */}
      <rect x={0} y={R.headerY} width={DW} height={R.headerH} fill="#fff" />
      <rect x={0} y={R.headerY} width={DW} height={4} fill={C.darkBlue} />
      <SvgText x={LW + 12} y={R.headerY + 28} anchor="start" text={data.title} fontSize={22} fontWeight="bold" fill={C.darkBlue} />
      <SvgText x={LW + 12} y={R.headerY + 52} anchor="start" text={data.subtitle} fontSize={12} fill="#6b7280" />

      {/* ── Row label: Prozesskette ── */}
      <rect x={0} y={R.stepY} width={LW} height={R.stepH} fill={C.darkBlue} />
      <circle cx={LW / 2} cy={R.stepY + 24} r={16} fill="none" stroke="#fff" strokeWidth={2} />
      <SvgText x={LW / 2} y={R.stepY + 29} text="1" fontSize={13} fill="#fff" fontWeight="bold" />
      <SvgText x={LW / 2} y={R.stepY + 60} text={"PROZESS-\nKETTE"} fontSize={9} fill="#fff" fontWeight="bold" lineHeight={12} />

      {/* ── Process steps row background ── */}
      <rect x={LW} y={R.stepY} width={CW} height={R.stepH} fill={C.darkBlue} />

      {/* ── Process step boxes ── */}
      {data.steps.map((step, i) => {
        const cx = colCX(i);
        const bw = Math.min(colW - 6, 72);
        const bh = 38;
        const bx = cx - bw / 2;
        const by = R.stepY + (R.stepH - bh) / 2;
        return (
          <g key={step.id}>
            <rect x={bx} y={by} width={bw} height={bh} rx={6} fill={C.darkBlue} stroke="#ffffff" strokeWidth={1.5} />
            <circle cx={bx + 10} cy={by + 10} r={8} fill="#fff" />
            <SvgText x={bx + 10} y={by + 14} text={String(i + 1)} fontSize={8} fill={C.darkBlue} fontWeight="bold" />
            <SvgText x={cx} y={by + bh / 2 + 5} text={step.label} fontSize={9} fill="#fff" fontWeight="bold" />
            {i < data.steps.length - 1 && (
              <line
                x1={bx + bw} y1={by + bh / 2}
                x2={colCX(i + 1) - (Math.min(colW - 6, 72)) / 2} y2={by + bh / 2}
                stroke="#fff" strokeWidth={1.5} markerEnd="url(#arr)"
              />
            )}
          </g>
        );
      })}

      {/* ── Row label: Informationsobjekte ── */}
      <rect x={0} y={R.infoY} width={LW} height={R.infoH} fill={C.infoGreen} />
      <circle cx={LW / 2} cy={R.infoY + 24} r={16} fill="none" stroke="#fff" strokeWidth={2} />
      <SvgText x={LW / 2} y={R.infoY + 29} text="2" fontSize={13} fill="#fff" fontWeight="bold" />
      <SvgText x={LW / 2} y={R.infoY + 62} text={"INFORMA-\nTIONS-\nOBJEKTE"} fontSize={8} fill="#fff" fontWeight="bold" lineHeight={11} />

      {/* ── Info row background ── */}
      <rect x={LW} y={R.infoY} width={CW} height={R.infoH} fill="#f0f4ef" />

      {/* ── Info object cards ── */}
      {data.infoObjects.map((io) => {
        const i = idx(io.stepId);
        if (i < 0) return null;
        const cx = colCX(i);
        const bw = Math.min(colW - 8, 68);
        const bh = 80;
        const bx = cx - bw / 2;
        const by = R.infoY + (R.infoH - bh) / 2;
        const lines = io.label.split("\n");
        return (
          <g key={io.id}>
            <rect x={bx} y={by} width={bw} height={bh} rx={6} fill="#fff" stroke="#c8d8c4" strokeWidth={1.5} />
            {/* small doc icon */}
            <rect x={cx - 8} y={by + 8} width={16} height={18} rx={2} fill={C.infoGreen} opacity={0.15} />
            <rect x={cx - 5} y={by + 11} width={10} height={2} rx={1} fill={C.infoGreen} opacity={0.5} />
            <rect x={cx - 5} y={by + 15} width={8}  height={2} rx={1} fill={C.infoGreen} opacity={0.5} />
            <rect x={cx - 5} y={by + 19} width={6}  height={2} rx={1} fill={C.infoGreen} opacity={0.5} />
            <SvgText x={cx} y={by + 42 + (lines.length - 1) * 2} text={io.label} fontSize={8.5} fill="#1f2937" lineHeight={12} />
          </g>
        );
      })}

      {/* ── Row label: Tools/Systeme ── */}
      <rect x={0} y={R.tool1Y} width={LW} height={R.tool1H + R.tool2H} fill={C.shadow} />
      <circle cx={LW / 2} cy={R.tool1Y + 24} r={16} fill="none" stroke="#fff" strokeWidth={2} />
      <SvgText x={LW / 2} y={R.tool1Y + 29} text="3" fontSize={13} fill="#fff" fontWeight="bold" />
      <SvgText x={LW / 2} y={R.tool1Y + 65} text={"TOOLS /\nSYSTEME"} fontSize={9} fill="#fff" fontWeight="bold" lineHeight={13} />

      {/* ── Tools row background ── */}
      <rect x={LW} y={R.tool1Y} width={CW} height={R.tool1H + R.tool2H} fill={C.toolsBg} />

      {/* ── Connection paths (drawn BEHIND tool boxes) ── */}
      {connPaths.map(({ id, d, type }) => {
        const s = CONN[type] || CONN.manual;
        return (
          <path
            key={id} d={d}
            stroke={s.stroke} strokeWidth={s.w}
            strokeDasharray={s.dash === "none" ? undefined : s.dash}
            fill="none" opacity={0.85}
          />
        );
      })}

      {/* ── Tool boxes ── */}
      {data.tools.map((tool) => {
        const rect = toolRect(tool);
        const isCore = tool.style === "core";
        const isLeading = tool.style === "leading";
        const borderColor = isCore || isLeading ? C.green : "#9ca3af";
        const bg = isCore || isLeading ? C.greenLight : "#f3f4f6";
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;

        return (
          <g key={tool.id}>
            <rect
              x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={8}
              fill={bg} stroke={borderColor} strokeWidth={isCore ? 2.5 : 1.5}
            />
            {isCore && (
              <>
                <rect x={rect.x + 2} y={rect.y + 2} width={rect.w - 4} height={rect.h - 4} rx={6} fill="none" stroke={C.green} strokeWidth={1} opacity={0.4} />
                <rect x={cx - 30} y={rect.y + rect.h - 16} width={60} height={14} rx={4} fill={C.green} />
                <SvgText x={cx} y={rect.y + rect.h - 5} text="GESETZT" fontSize={7.5} fill="#fff" fontWeight="bold" />
                <SvgText x={cx} y={rect.y + 14} text="Kernsystem Konstruktion" fontSize={7} fill={C.green} fontWeight="bold" />
              </>
            )}
            <SvgText
              x={cx} y={cy + (isCore ? -8 : 0)}
              text={tool.label} fontSize={isCore ? 13 : 10}
              fill={isCore ? C.green : "#1f2937"}
              fontWeight={isCore ? "bold" : "600"}
              lineHeight={14}
            />
            {tool.hasLightning && <Lightning cx={rect.x + rect.w - 10} cy={rect.y + 10} size={14} />}
          </g>
        );
      })}

      {/* ── Legend ── */}
      <rect x={LW + CW + 4} y={R.stepY} width={RW - 8} height={R.tool2Y + R.tool2H - R.stepY} rx={6} fill="#fff" stroke="#e5e7eb" strokeWidth={1} />
      <SvgText x={LW + CW + RW / 2} y={R.stepY + 18} text="LEGENDE" fontSize={10} fill={C.darkBlue} fontWeight="bold" />
      {Object.entries(CONN).map(([key, s], i) => {
        const lx = LW + CW + 16;
        const ly = R.stepY + 34 + i * 36;
        return (
          <g key={key}>
            {s.dash === "none"
              ? <line x1={lx} y1={ly + 5} x2={lx + 28} y2={ly + 5} stroke={s.stroke} strokeWidth={s.w} />
              : <line x1={lx} y1={ly + 5} x2={lx + 28} y2={ly + 5} stroke={s.stroke} strokeWidth={s.w} strokeDasharray={s.dash} />
            }
            <SvgText x={lx + 34} y={ly + 9} anchor="start" text={s.label} fontSize={8.5} fill="#374151" />
          </g>
        );
      })}

      {/* Guide questions */}
      <rect x={LW + CW + 8} y={R.tool1Y} width={RW - 16} height={R.tool1H + R.tool2H - 8} rx={6} fill="#f8fafc" stroke="#e5e7eb" strokeWidth={1} />
      <SvgText x={LW + CW + RW / 2} y={R.tool1Y + 16} text="? LEITFRAGEN" fontSize={9.5} fill={C.darkBlue} fontWeight="bold" />
      {data.guideQuestions.map((q, i) => (
        <g key={i}>
          <circle cx={LW + CW + 20} cy={R.tool1Y + 36 + i * 40} r={8} fill={C.darkBlue} opacity={0.15} />
          <SvgText x={LW + CW + 20} y={R.tool1Y + 40 + i * 40} text="?" fontSize={9} fill={C.darkBlue} fontWeight="bold" />
          <SvgText x={LW + CW + 34} y={R.tool1Y + 34 + i * 40} anchor="start" text={q} fontSize={8} fill="#374151" lineHeight={11} />
        </g>
      ))}

      {/* ── Footer ── */}
      <rect x={0} y={R.footerY} width={DW} height={R.footerH} fill={C.darkBlue} />
      <SvgText x={DW / 2} y={R.footerY + R.footerH / 2 + 5} text={data.motto.toUpperCase()} fontSize={11} fill="#fff" fontWeight="bold" />
    </svg>
  );
}

// ─── Editor Sidebar ───────────────────────────────────────────────────────────
const TABS = ["Allgemein", "Schritte", "Infos", "Tools", "Verbindungen"];

const inp = {
  width: "100%", padding: "6px 8px", border: "1.5px solid #d1d5db",
  borderRadius: 6, fontSize: 12, outline: "none", boxSizing: "border-box",
  fontFamily: "system-ui,sans-serif", background: "#fff",
};
const btn = (color = "#00004a") => ({
  padding: "6px 12px", background: color, color: "#fff", border: "none",
  borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
});
const smallBtn = (color = "#ef4444") => ({
  padding: "2px 8px", background: color, color: "#fff", border: "none",
  borderRadius: 4, cursor: "pointer", fontSize: 11,
});

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  );
}

function TabAllgemein({ data, update }) {
  return (
    <div>
      <Section title="Titel">
        <Field label="Haupttitel">
          <input style={inp} value={data.title} onChange={(e) => update({ title: e.target.value })} />
        </Field>
        <Field label="Untertitel">
          <input style={inp} value={data.subtitle} onChange={(e) => update({ subtitle: e.target.value })} />
        </Field>
        <Field label="Fußzeilen-Motto">
          <input style={inp} value={data.motto} onChange={(e) => update({ motto: e.target.value })} />
        </Field>
      </Section>
      <Section title="Leitfragen">
        {data.guideQuestions.map((q, i) => (
          <div key={i} style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            <input
              style={{ ...inp, flex: 1 }} value={q}
              onChange={(e) => {
                const gq = [...data.guideQuestions];
                gq[i] = e.target.value;
                update({ guideQuestions: gq });
              }}
            />
            <button style={smallBtn()} onClick={() => update({ guideQuestions: data.guideQuestions.filter((_, j) => j !== i) })}>×</button>
          </div>
        ))}
        <button style={btn("#2d6a1e")} onClick={() => update({ guideQuestions: [...data.guideQuestions, "Neue Leitfrage?"] })}>+ Frage</button>
      </Section>
    </div>
  );
}

function TabSchritte({ data, update }) {
  const move = (i, dir) => {
    const s = [...data.steps];
    const t = s[i + dir]; s[i + dir] = s[i]; s[i] = t;
    update({ steps: s });
  };
  return (
    <div>
      <Section title="Prozessschritte">
        {data.steps.map((step, i) => (
          <div key={step.id} style={{ display: "flex", gap: 4, marginBottom: 6, alignItems: "center" }}>
            <span style={{ width: 20, fontSize: 11, color: "#9ca3af", fontWeight: 700 }}>{i + 1}</span>
            <input
              style={{ ...inp, flex: 1 }} value={step.label}
              onChange={(e) => {
                const s = data.steps.map((st) => st.id === step.id ? { ...st, label: e.target.value } : st);
                update({ steps: s });
              }}
            />
            <button style={smallBtn("#9ca3af")} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
            <button style={smallBtn("#9ca3af")} disabled={i === data.steps.length - 1} onClick={() => move(i, 1)}>↓</button>
            <button style={smallBtn()} onClick={() => {
              const id = step.id;
              update({
                steps: data.steps.filter((s) => s.id !== id),
                infoObjects: data.infoObjects.filter((o) => o.stepId !== id),
                connections: data.connections.filter((c) => {
                  const io = data.infoObjects.find((o) => o.id === c.fromInfoObject);
                  return io ? io.stepId !== id : true;
                }),
              });
            }}>×</button>
          </div>
        ))}
        <button style={btn("#2d6a1e")} onClick={() => {
          const id = uid();
          update({ steps: [...data.steps, { id, label: "Neuer Schritt" }] });
        }}>+ Schritt</button>
      </Section>
    </div>
  );
}

function TabInfos({ data, update }) {
  return (
    <div>
      <Section title="Informationsobjekte">
        <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
          Ein Objekt je Prozessschritt. Zeilenumbruch mit \n.
        </p>
        {data.steps.map((step) => {
          const io = data.infoObjects.find((o) => o.stepId === step.id);
          return (
            <div key={step.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.infoGreen, marginBottom: 3 }}>{step.label}</div>
              {io ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <textarea
                    style={{ ...inp, resize: "vertical", minHeight: 36 }}
                    value={io.label.replace(/\\n/g, "\n")}
                    onChange={(e) => {
                      const label = e.target.value.replace(/\n/g, "\n");
                      update({ infoObjects: data.infoObjects.map((o) => o.id === io.id ? { ...o, label } : o) });
                    }}
                  />
                  <button style={smallBtn()} onClick={() => update({ infoObjects: data.infoObjects.filter((o) => o.id !== io.id) })}>×</button>
                </div>
              ) : (
                <button style={btn("#2d6a1e")} onClick={() => {
                  update({ infoObjects: [...data.infoObjects, { id: uid(), stepId: step.id, label: "Information" }] });
                }}>+ Hinzufügen</button>
              )}
            </div>
          );
        })}
      </Section>
    </div>
  );
}

const TOOL_STYLES = [
  { value: "shadow",  label: "Schattenlösung" },
  { value: "leading", label: "Führendes System" },
  { value: "core",    label: "Kernsystem (GESETZT)" },
];

function TabTools({ data, update }) {
  return (
    <div>
      <Section title="Tools & Systeme">
        {data.tools.map((tool) => (
          <div key={tool.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>{tool.label.replace(/\n/g, " ")}</span>
              <button style={smallBtn()} onClick={() => update({ tools: data.tools.filter((t) => t.id !== tool.id) })}>×</button>
            </div>
            <Field label="Bezeichnung (\\n für Umbruch)">
              <input style={inp} value={tool.label.replace(/\n/g, "\\n")}
                onChange={(e) => {
                  const label = e.target.value.replace(/\\n/g, "\n");
                  update({ tools: data.tools.map((t) => t.id === tool.id ? { ...t, label } : t) });
                }} />
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <Field label="Von Schritt">
                <select style={inp} value={tool.startStep}
                  onChange={(e) => update({ tools: data.tools.map((t) => t.id === tool.id ? { ...t, startStep: e.target.value } : t) })}>
                  {data.steps.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Bis Schritt">
                <select style={inp} value={tool.endStep}
                  onChange={(e) => update({ tools: data.tools.map((t) => t.id === tool.id ? { ...t, endStep: e.target.value } : t) })}>
                  {data.steps.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Field label="Zeile">
                <select style={inp} value={tool.row}
                  onChange={(e) => update({ tools: data.tools.map((t) => t.id === tool.id ? { ...t, row: Number(e.target.value) } : t) })}>
                  <option value={1}>Oben</option>
                  <option value={2}>Unten</option>
                </select>
              </Field>
              <Field label="Typ">
                <select style={inp} value={tool.style}
                  onChange={(e) => update({ tools: data.tools.map((t) => t.id === tool.id ? { ...t, style: e.target.value } : t) })}>
                  {TOOL_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
              <input type="checkbox" checked={tool.hasLightning}
                onChange={(e) => update({ tools: data.tools.map((t) => t.id === tool.id ? { ...t, hasLightning: e.target.checked } : t) })} />
              ⚡ Medienbruch / Problem markieren
            </label>
          </div>
        ))}
        <button style={btn("#2d6a1e")} onClick={() => update({
          tools: [...data.tools, {
            id: uid(), label: "Neues Tool", startStep: data.steps[0]?.id, endStep: data.steps[0]?.id,
            row: 1, style: "shadow", hasLightning: false,
          }],
        })}>+ Tool hinzufügen</button>
      </Section>
    </div>
  );
}

const CONN_TYPE_OPTS = [
  { value: "leading",    label: "Führendes System" },
  { value: "manual",     label: "Manuelle Übergabe" },
  { value: "mediaBreak", label: "Medienbruch" },
  { value: "shadow",     label: "Schattenlösung" },
];

function TabVerbindungen({ data, update }) {
  return (
    <div>
      <Section title="Verbindungen">
        <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>Verbindungen zwischen Informationsobjekten und Tools.</p>
        {data.connections.map((conn) => {
          const io = data.infoObjects.find((o) => o.id === conn.fromInfoObject);
          const tool = data.tools.find((t) => t.id === conn.toTool);
          return (
            <div key={conn.id} style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "#6b7280" }}>
                  {io?.label.replace(/\n/g, " ")} → {tool?.label.replace(/\n/g, " ")}
                </span>
                <button style={smallBtn()} onClick={() => update({ connections: data.connections.filter((c) => c.id !== conn.id) })}>×</button>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Von (Info)</div>
                  <select style={{ ...inp, fontSize: 10 }} value={conn.fromInfoObject}
                    onChange={(e) => update({ connections: data.connections.map((c) => c.id === conn.id ? { ...c, fromInfoObject: e.target.value } : c) })}>
                    {data.infoObjects.map((o) => <option key={o.id} value={o.id}>{o.label.replace(/\n/g, " ")}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Nach (Tool)</div>
                  <select style={{ ...inp, fontSize: 10 }} value={conn.toTool}
                    onChange={(e) => update({ connections: data.connections.map((c) => c.id === conn.id ? { ...c, toTool: e.target.value } : c) })}>
                    {data.tools.map((t) => <option key={t.id} value={t.id}>{t.label.replace(/\n/g, " ")}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Typ</div>
                  <select style={{ ...inp, fontSize: 10 }} value={conn.type}
                    onChange={(e) => update({ connections: data.connections.map((c) => c.id === conn.id ? { ...c, type: e.target.value } : c) })}>
                    {CONN_TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
        <button style={btn("#2d6a1e")} onClick={() => {
          if (!data.infoObjects.length || !data.tools.length) return;
          update({
            connections: [...data.connections, {
              id: uid(), fromInfoObject: data.infoObjects[0].id,
              toTool: data.tools[0].id, type: "manual",
            }],
          });
        }}>+ Verbindung</button>
      </Section>
    </div>
  );
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportPDF() {
  const style = document.createElement("style");
  style.id = "__tl_print__";
  style.textContent = `
    @media print {
      @page { size: A4 landscape; margin: 8mm; }
      body > * { display: none !important; }
      #__tl_print_root__ { display: block !important; position: fixed; inset: 0; }
    }
  `;
  const root = document.createElement("div");
  root.id = "__tl_print_root__";
  root.style.cssText = "display:none;";
  const svg = document.getElementById("tool-landscape-svg");
  if (svg) root.innerHTML = svg.outerHTML;
  document.head.appendChild(style);
  document.body.appendChild(root);
  window.print();
  setTimeout(() => {
    document.head.removeChild(style);
    document.body.removeChild(root);
  }, 2000);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ToolLandscapeDesigner({ modul, onSave }) {
  const [data, setData] = useState(() => {
    if (modul?.data && modul.data.title) return modul.data;
    return DEFAULT;
  });
  const [tab, setTab] = useState(0);

  const update = useCallback((patch) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      if (onSave) onSave(next);
      return next;
    });
  }, [onSave]);

  const tabContent = [
    <TabAllgemein    key={0} data={data} update={update} />,
    <TabSchritte     key={1} data={data} update={update} />,
    <TabInfos        key={2} data={data} update={update} />,
    <TabTools        key={3} data={data} update={update} />,
    <TabVerbindungen key={4} data={data} update={update} />,
  ];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#f4f6fb" }}>

      {/* ── Editor Sidebar ── */}
      <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", background: "#fff", borderRight: "1.5px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 0", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#00004a", marginBottom: 10 }}>Toollandschaft bearbeiten</div>
          <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {TABS.map((t, i) => (
              <button key={i} onClick={() => setTab(i)} style={{
                padding: "5px 10px", border: "none", borderRadius: "6px 6px 0 0", cursor: "pointer",
                fontSize: 11, fontWeight: tab === i ? 700 : 400,
                background: tab === i ? "#00004a" : "#f3f4f6",
                color: tab === i ? "#fff" : "#6b7280",
              }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {tabContent[tab]}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
          <button style={{ ...btn(), flex: 1 }} onClick={exportPDF}>PDF exportieren</button>
          <button style={{ ...btn("#6b7280") }} onClick={() => setData(DEFAULT)} title="Beispiel laden">Beispiel</button>
        </div>
      </div>

      {/* ── Diagram Preview ── */}
      <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 1200, background: "#fff", borderRadius: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <DiagramSVG data={data} />
        </div>
      </div>
    </div>
  );
}
