import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { supabase } from "./lib/supabase";

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((mod) => ({ default: mod.Excalidraw }))
);

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ampelColor(ampel) {
  if (ampel === "gruen") return "#22c55e";
  if (ampel === "gelb") return "#eab308";
  if (ampel === "rot") return "#ef4444";
  return "#d1d5db";
}

function ampelLabel(ampel) {
  if (ampel === "gruen") return "Gut";
  if (ampel === "gelb") return "Achtung";
  if (ampel === "rot") return "Kritisch";
  return "Offen";
}

const PHASEN = [
  { key: "orientierung", label: "Orientierung" },
  { key: "analyse", label: "Analyse" },
  { key: "strategie", label: "Strategie" },
  { key: "umsetzung", label: "Umsetzung" },
  { key: "verstetigung", label: "Verstetigung" },
];

const MODULE_TYPES = {
  issue_map: "Issue Map",
  eisenhower: "Eisenhower-Matrix",
  prozesslandkarte: "Prozesslandkarte",
  todo: "ToDo-Liste",
  whiteboard: "Whiteboard",
};

// ── Auth ─────────────────────────────────────────────────────────────────────

function AuthScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // login | reset
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  async function handleReset(e) {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) setError(error.message);
    else setInfo("E-Mail zum Zurücksetzen wurde gesendet.");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 40, width: 380, boxShadow: "0 4px 24px rgba(0,0,74,0.10)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: "#00004a", borderRadius: 12, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#c0003c", fontSize: 22, fontWeight: 900 }}>IC</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#00004a", margin: 0 }}>INQA-Coaching</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>{mode === "login" ? "Anmelden" : "Passwort zurücksetzen"}</p>
        </div>

        <form onSubmit={mode === "login" ? handleLogin : handleReset}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>E-Mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {mode === "login" && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Passwort</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          )}
          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          {info && <p style={{ color: "#22c55e", fontSize: 13, marginBottom: 12 }}>{info}</p>}
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "11px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            {loading ? "…" : mode === "login" ? "Anmelden" : "Link senden"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={() => { setMode(mode === "login" ? "reset" : "login"); setError(""); setInfo(""); }}
            style={{ background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
            {mode === "login" ? "Passwort vergessen?" : "Zurück zum Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Whiteboard-Modul ─────────────────────────────────────────────────────────

function WhiteboardModule({ modul, tenantId, userRole }) {
  const [elements, setElements] = useState(modul.data?.elements || []);
  const [appState, setAppState] = useState(modul.data?.appState || {});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const channelRef = useRef(null);
  const saveTimerRef = useRef(null);
  const isRemoteUpdate = useRef(false);

  // Supabase Realtime Broadcast für Live-Kollaboration
  useEffect(() => {
    const channelName = `whiteboard:${modul.id}`;
    const channel = supabase.channel(channelName);

    channel.on("broadcast", { event: "draw" }, ({ payload }) => {
      isRemoteUpdate.current = true;
      setElements(payload.elements);
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    }).subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [modul.id]);

  // Speichern mit Debounce
  const saveToDb = useCallback(async (els, as) => {
    setSaving(true);
    await supabase
      .from("modules")
      .update({ data: { elements: els, appState: as } })
      .eq("id", modul.id);
    setSaving(false);
    setLastSaved(new Date());
  }, [modul.id]);

  function handleChange(els, as) {
    if (isRemoteUpdate.current) return;
    setElements(els);
    setAppState(as);

    // Broadcast an andere Nutzer
    if (channelRef.current) {
      channelRef.current.send({ type: "broadcast", event: "draw", payload: { elements: els } });
    }

    // Debounced save nach 1.5s
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveToDb(els, as), 1500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#00004a" }}>{modul.title}</h3>
          {modul.description && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>{modul.description}</p>}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          {saving ? "Speichern…" : lastSaved ? `Gespeichert ${lastSaved.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}` : ""}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 500, border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 500, color: "#6b7280" }}>Whiteboard wird geladen…</div>}>
          <Excalidraw
            initialData={{ elements, appState: { ...appState, collaborators: [] } }}
            onChange={handleChange}
            UIOptions={{ canvasActions: { export: false, loadScene: false, saveAsImage: true } }}
          />
        </Suspense>
      </div>
    </div>
  );
}

// ── Issue Map ────────────────────────────────────────────────────────────────

function IssueMapModule({ modul, tenantId, userRole }) {
  const [issues, setIssues] = useState(modul.data?.issues || []);
  const [newIssue, setNewIssue] = useState({ title: "", category: "Problem", priority: "Mittel" });
  const [saving, setSaving] = useState(false);

  const CATEGORIES = ["Problem", "Risiko", "Chance", "Frage"];
  const PRIORITIES = ["Hoch", "Mittel", "Niedrig"];

  async function save(updated) {
    setSaving(true);
    await supabase.from("modules").update({ data: { issues: updated } }).eq("id", modul.id);
    setSaving(false);
  }

  async function addIssue() {
    if (!newIssue.title.trim()) return;
    const updated = [...issues, { ...newIssue, id: Date.now(), created_at: new Date().toISOString() }];
    setIssues(updated);
    await save(updated);
    setNewIssue({ title: "", category: "Problem", priority: "Mittel" });
  }

  async function removeIssue(id) {
    const updated = issues.filter(i => i.id !== id);
    setIssues(updated);
    await save(updated);
  }

  const priColor = { Hoch: "#fee2e2", Mittel: "#fef9c3", Niedrig: "#dcfce7" };
  const priText = { Hoch: "#991b1b", Mittel: "#854d0e", Niedrig: "#166534" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={newIssue.title} onChange={e => setNewIssue({ ...newIssue, title: e.target.value })}
          placeholder="Neues Issue beschreiben…"
          style={{ flex: 1, minWidth: 180, padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
        <select value={newIssue.category} onChange={e => setNewIssue({ ...newIssue, category: e.target.value })}
          style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={newIssue.priority} onChange={e => setNewIssue({ ...newIssue, priority: e.target.value })}
          style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <button onClick={addIssue} disabled={saving}
          style={{ padding: "8px 18px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + Hinzufügen
        </button>
      </div>
      {issues.length === 0 && <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Noch keine Issues erfasst.</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {issues.map(issue => (
          <div key={issue.id} style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: priColor[issue.priority] || "#f3f4f6", color: priText[issue.priority] || "#374151" }}>
              {issue.priority}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", minWidth: 70 }}>{issue.category}</span>
            <span style={{ flex: 1, fontSize: 14, color: "#111827" }}>{issue.title}</span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{formatDate(issue.created_at)}</span>
            {userRole === "admin" && (
              <button onClick={() => removeIssue(issue.id)}
                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Eisenhower ───────────────────────────────────────────────────────────────

function EisenhowerModule({ modul, tenantId, userRole }) {
  const [tasks, setTasks] = useState(modul.data?.tasks || []);
  const [newTask, setNewTask] = useState({ title: "", quadrant: "wichtig_dringend" });
  const [saving, setSaving] = useState(false);

  const QUADRANTS = [
    { key: "wichtig_dringend", label: "Wichtig & Dringend", color: "#fee2e2", border: "#fca5a5" },
    { key: "wichtig_nicht_dringend", label: "Wichtig & Nicht dringend", color: "#dcfce7", border: "#86efac" },
    { key: "nicht_wichtig_dringend", label: "Nicht wichtig & Dringend", color: "#fef9c3", border: "#fde047" },
    { key: "nicht_wichtig_nicht_dringend", label: "Nicht wichtig & Nicht dringend", color: "#f3f4f6", border: "#d1d5db" },
  ];

  async function save(updated) {
    setSaving(true);
    await supabase.from("modules").update({ data: { tasks: updated } }).eq("id", modul.id);
    setSaving(false);
  }

  async function addTask() {
    if (!newTask.title.trim()) return;
    const updated = [...tasks, { ...newTask, id: Date.now() }];
    setTasks(updated);
    await save(updated);
    setNewTask({ title: "", quadrant: "wichtig_dringend" });
  }

  async function removeTask(id) {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    await save(updated);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
          placeholder="Neue Aufgabe…"
          style={{ flex: 1, minWidth: 180, padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
        <select value={newTask.quadrant} onChange={e => setNewTask({ ...newTask, quadrant: e.target.value })}
          style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}>
          {QUADRANTS.map(q => <option key={q.key} value={q.key}>{q.label}</option>)}
        </select>
        <button onClick={addTask} disabled={saving}
          style={{ padding: "8px 18px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + Hinzufügen
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {QUADRANTS.map(q => (
          <div key={q.key} style={{ background: q.color, border: `1.5px solid ${q.border}`, borderRadius: 10, padding: 14 }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#374151" }}>{q.label}</h4>
            {tasks.filter(t => t.quadrant === q.key).length === 0
              ? <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Leer</p>
              : tasks.filter(t => t.quadrant === q.key).map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 13, color: "#111827" }}>{t.title}</span>
                  {userRole === "admin" && (
                    <button onClick={() => removeTask(t.id)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
                  )}
                </div>
              ))
            }
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Prozesslandkarte ─────────────────────────────────────────────────────────

function ProzesslandkarteModule({ modul, tenantId, userRole }) {
  const [prozesse, setProzesse] = useState(modul.data?.prozesse || []);
  const [newProzess, setNewProzess] = useState({ name: "", typ: "Kernprozess", beschreibung: "" });
  const [saving, setSaving] = useState(false);

  const TYPEN = ["Kernprozess", "Managementprozess", "Unterstützungsprozess"];
  const typColor = { Kernprozess: "#dbeafe", Managementprozess: "#ede9fe", Unterstützungsprozess: "#d1fae5" };

  async function save(updated) {
    setSaving(true);
    await supabase.from("modules").update({ data: { prozesse: updated } }).eq("id", modul.id);
    setSaving(false);
  }

  async function add() {
    if (!newProzess.name.trim()) return;
    const updated = [...prozesse, { ...newProzess, id: Date.now() }];
    setProzesse(updated);
    await save(updated);
    setNewProzess({ name: "", typ: "Kernprozess", beschreibung: "" });
  }

  async function remove(id) {
    const updated = prozesse.filter(p => p.id !== id);
    setProzesse(updated);
    await save(updated);
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={newProzess.name} onChange={e => setNewProzess({ ...newProzess, name: e.target.value })}
            placeholder="Prozessname…"
            style={{ flex: 1, minWidth: 180, padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
          <select value={newProzess.typ} onChange={e => setNewProzess({ ...newProzess, typ: e.target.value })}
            style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}>
            {TYPEN.map(t => <option key={t}>{t}</option>)}
          </select>
          <button onClick={add} disabled={saving}
            style={{ padding: "8px 18px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            + Hinzufügen
          </button>
        </div>
        <input value={newProzess.beschreibung} onChange={e => setNewProzess({ ...newProzess, beschreibung: e.target.value })}
          placeholder="Kurze Beschreibung (optional)…"
          style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
      </div>
      {TYPEN.map(typ => {
        const filtered = prozesse.filter(p => p.typ === typ);
        if (filtered.length === 0) return null;
        return (
          <div key={typ} style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#374151" }}>{typ}</h4>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {filtered.map(p => (
                <div key={p.id} style={{ background: typColor[p.typ] || "#f3f4f6", borderRadius: 10, padding: "10px 14px", position: "relative", minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{p.name}</div>
                  {p.beschreibung && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{p.beschreibung}</div>}
                  {userRole === "admin" && (
                    <button onClick={() => remove(p.id)}
                      style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {prozesse.length === 0 && <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Noch keine Prozesse erfasst.</p>}
    </div>
  );
}

// ── ToDo-Liste ───────────────────────────────────────────────────────────────

function TodoModule({ modul, tenantId, userRole }) {
  const [todos, setTodos] = useState(modul.data?.todos || []);
  const [newTodo, setNewTodo] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(updated) {
    setSaving(true);
    await supabase.from("modules").update({ data: { todos: updated } }).eq("id", modul.id);
    setSaving(false);
  }

  async function addTodo() {
    if (!newTodo.trim()) return;
    const updated = [...todos, { id: Date.now(), title: newTodo, done: false }];
    setTodos(updated);
    await save(updated);
    setNewTodo("");
  }

  async function toggleTodo(id) {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(updated);
    await save(updated);
  }

  async function removeTodo(id) {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    await save(updated);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input value={newTodo} onChange={e => setNewTodo(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTodo()}
          placeholder="Neue Aufgabe…"
          style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
        <button onClick={addTodo} disabled={saving}
          style={{ padding: "8px 18px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + Hinzufügen
        </button>
      </div>
      {todos.length === 0 && <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Noch keine Aufgaben.</p>}
      <div style={{ display: "grid", gap: 8 }}>
        {todos.map(todo => (
          <div key={todo.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f9fafb", borderRadius: 8, border: "1.5px solid #e5e7eb" }}>
            <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)}
              style={{ width: 18, height: 18, cursor: "pointer" }} />
            <span style={{ flex: 1, fontSize: 14, color: todo.done ? "#9ca3af" : "#111827", textDecoration: todo.done ? "line-through" : "none" }}>{todo.title}</span>
            {userRole === "admin" && (
              <button onClick={() => removeTodo(todo.id)}
                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Modul-Renderer ───────────────────────────────────────────────────────────

function ModulRenderer({ modul, tenantId, userRole }) {
  const props = { modul, tenantId, userRole };
  switch (modul.type) {
    case "whiteboard": return <WhiteboardModule {...props} />;
    case "issue_map": return <IssueMapModule {...props} />;
    case "eisenhower": return <EisenhowerModule {...props} />;
    case "prozesslandkarte": return <ProzesslandkarteModule {...props} />;
    case "todo": return <TodoModule {...props} />;
    default: return <p style={{ color: "#9ca3af" }}>Unbekannter Modultyp: {modul.type}</p>;
  }
}

// ── Module-Bereich ───────────────────────────────────────────────────────────

function ModuleArea({ tenant, userRole }) {
  const [modules, setModules] = useState([]);
  const [activeModul, setActiveModul] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newModul, setNewModul] = useState({ type: "whiteboard", title: "", description: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModules();
  }, [tenant.id]);

  async function loadModules() {
    setLoading(true);
    const { data } = await supabase
      .from("modules")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true });
    setModules(data || []);
    setLoading(false);
  }

  async function addModule() {
    if (!newModul.title.trim()) return;
    const { data, error } = await supabase.from("modules").insert({
      tenant_id: tenant.id,
      type: newModul.type,
      title: newModul.title,
      description: newModul.description,
      data: {},
      active: true,
    }).select().single();
    if (!error && data) {
      setModules([...modules, data]);
      setActiveModul(data);
      setShowAdd(false);
      setNewModul({ type: "whiteboard", title: "", description: "" });
    }
  }

  async function toggleModule(id, active) {
    await supabase.from("modules").update({ active: !active }).eq("id", id);
    setModules(modules.map(m => m.id === id ? { ...m, active: !active } : m));
  }

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Lade Module…</div>;

  const activeModules = modules.filter(m => m.active);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", gap: 0 }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: "#f8fafc", borderRight: "1.5px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>MODULE</span>
          {userRole === "admin" && (
            <button onClick={() => setShowAdd(!showAdd)}
              style={{ background: "#00004a", color: "#fff", border: "none", borderRadius: 6, width: 24, height: 24, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {activeModules.length === 0 && (
            <p style={{ padding: 16, fontSize: 13, color: "#9ca3af" }}>Noch keine Module aktiviert.</p>
          )}
          {activeModules.map(m => (
            <button key={m.id} onClick={() => setActiveModul(m)}
              style={{
                width: "100%", textAlign: "left", padding: "10px 16px", border: "none",
                background: activeModul?.id === m.id ? "#e0e7ff" : "transparent",
                borderLeft: activeModul?.id === m.id ? "3px solid #00004a" : "3px solid transparent",
                cursor: "pointer", fontSize: 14, color: activeModul?.id === m.id ? "#00004a" : "#374151",
                fontWeight: activeModul?.id === m.id ? 700 : 400,
              }}>
              {m.title}
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{MODULE_TYPES[m.type] || m.type}</div>
            </button>
          ))}
          {userRole === "admin" && modules.filter(m => !m.active).length > 0 && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 8 }}>INAKTIV</div>
              {modules.filter(m => !m.active).map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>{m.title}</span>
                  <button onClick={() => toggleModule(m.id, m.active)}
                    style={{ fontSize: 11, background: "#f3f4f6", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", color: "#374151" }}>
                    Aktivieren
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modul-Inhalt */}
      <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        {showAdd && userRole === "admin" && (
          <div style={{ background: "#f0f4ff", border: "1.5px solid #c7d2fe", borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h4 style={{ margin: "0 0 16px", color: "#00004a" }}>Neues Modul hinzufügen</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select value={newModul.type} onChange={e => setNewModul({ ...newModul, type: e.target.value })}
                style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}>
                {Object.entries(MODULE_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <input value={newModul.title} onChange={e => setNewModul({ ...newModul, title: e.target.value })}
                placeholder="Titel des Moduls…"
                style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
              <input value={newModul.description} onChange={e => setNewModul({ ...newModul, description: e.target.value })}
                placeholder="Kurze Beschreibung (optional)…"
                style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addModule}
                  style={{ padding: "8px 20px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Modul anlegen
                </button>
                <button onClick={() => setShowAdd(false)}
                  style={{ padding: "8px 16px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {!activeModul ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧩</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>Kein Modul ausgewählt</p>
            <p style={{ fontSize: 14 }}>{activeModules.length > 0 ? "Wähle links ein Modul aus." : userRole === "admin" ? "Klicke auf + um das erste Modul hinzuzufügen." : "Noch keine Module vorhanden."}</p>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>{MODULE_TYPES[activeModul.type] || activeModul.type}</div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#00004a" }}>{activeModul.title}</h2>
                {activeModul.description && <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6b7280" }}>{activeModul.description}</p>}
              </div>
              {userRole === "admin" && (
                <button onClick={() => toggleModule(activeModul.id, activeModul.active)}
                  style={{ padding: "6px 14px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                  Deaktivieren
                </button>
              )}
            </div>
            <ModulRenderer modul={activeModul} tenantId={tenant.id} userRole={userRole} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Phasen ───────────────────────────────────────────────────────────────────

function PhasenArea({ tenant, userRole }) {
  const [phases, setPhases] = useState([]);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newStepText, setNewStepText] = useState({});
  const [activePhase, setActivePhase] = useState(null);

  useEffect(() => { loadAll(); }, [tenant.id]);

  async function loadAll() {
    setLoading(true);
    const { data: ph } = await supabase.from("phases").select("*").eq("tenant_id", tenant.id);
    const { data: st } = await supabase.from("phase_steps").select("*").eq("tenant_id", tenant.id).order("created_at");
    setPhases(ph || []);
    setSteps(st || []);
    setLoading(false);
  }

  async function addStep(phaseKey) {
    const text = newStepText[phaseKey]?.trim();
    if (!text) return;
    const phase = phases.find(p => p.phase_key === phaseKey);
    if (!phase) return;
    const { data } = await supabase.from("phase_steps").insert({
      tenant_id: tenant.id, phase_id: phase.id, title: text, done: false
    }).select().single();
    if (data) setSteps([...steps, data]);
    setNewStepText({ ...newStepText, [phaseKey]: "" });
  }

  async function toggleStep(id, done) {
    await supabase.from("phase_steps").update({ done: !done }).eq("id", id);
    setSteps(steps.map(s => s.id === id ? { ...s, done: !done } : s));
  }

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Lade Phasen…</div>;

  return (
    <div style={{ padding: 28 }}>
      {/* Phasen-Timeline */}
      <div style={{ display: "flex", gap: 0, marginBottom: 32 }}>
        {PHASEN.map((ph, i) => {
          const phase = phases.find(p => p.phase_key === ph.key);
          const phSteps = steps.filter(s => {
            const p = phases.find(pp => pp.id === s.phase_id);
            return p?.phase_key === ph.key;
          });
          const done = phSteps.filter(s => s.done).length;
          const total = phSteps.length;
          const isCurrent = phase?.is_current;
          return (
            <button key={ph.key} onClick={() => setActivePhase(activePhase === ph.key ? null : ph.key)}
              style={{
                flex: 1, padding: "14px 10px", border: "none", borderRight: i < 4 ? "2px solid #fff" : "none",
                background: isCurrent ? "#00004a" : activePhase === ph.key ? "#e0e7ff" : "#f1f5f9",
                color: isCurrent ? "#fff" : "#374151", cursor: "pointer", textAlign: "center",
                borderRadius: i === 0 ? "10px 0 0 10px" : i === 4 ? "0 10px 10px 0" : 0,
                transition: "all 0.2s",
              }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{ph.label}</div>
              {total > 0 && (
                <div style={{ fontSize: 11, opacity: 0.8 }}>{done}/{total} ✓</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Aktive Phase */}
      {activePhase && (() => {
        const ph = PHASEN.find(p => p.key === activePhase);
        const phase = phases.find(p => p.phase_key === activePhase);
        const phSteps = steps.filter(s => {
          const p = phases.find(pp => pp.id === s.phase_id);
          return p?.phase_key === activePhase;
        });
        return (
          <div style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#00004a" }}>Phase: {ph?.label}</h3>
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              {phSteps.map(step => (
                <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#fff", borderRadius: 8, border: "1.5px solid #e5e7eb" }}>
                  <input type="checkbox" checked={step.done} onChange={() => toggleStep(step.id, step.done)}
                    style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#00004a" }} />
                  <span style={{ flex: 1, fontSize: 14, color: step.done ? "#9ca3af" : "#111827", textDecoration: step.done ? "line-through" : "none" }}>{step.title}</span>
                </div>
              ))}
              {phSteps.length === 0 && <p style={{ color: "#9ca3af", margin: 0 }}>Noch keine Schritte für diese Phase.</p>}
            </div>
            {userRole === "admin" && (
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newStepText[activePhase] || ""} onChange={e => setNewStepText({ ...newStepText, [activePhase]: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && addStep(activePhase)}
                  placeholder="Neuen Schritt hinzufügen…"
                  style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
                <button onClick={() => addStep(activePhase)}
                  style={{ padding: "8px 18px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  + Hinzufügen
                </button>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ── Termine ──────────────────────────────────────────────────────────────────

function TermineArea({ tenant, userRole }) {
  const [termine, setTermine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTermin, setNewTermin] = useState({ title: "", date: "", time: "", location: "", notes: "" });

  useEffect(() => { loadTermine(); }, [tenant.id]);

  async function loadTermine() {
    setLoading(true);
    const { data } = await supabase.from("termine").select("*").eq("tenant_id", tenant.id).order("date");
    setTermine(data || []);
    setLoading(false);
  }

  async function addTermin() {
    if (!newTermin.title || !newTermin.date) return;
    const { data, error } = await supabase.from("termine").insert({
      tenant_id: tenant.id, ...newTermin
    }).select().single();
    if (!error && data) {
      setTermine([...termine, data].sort((a, b) => a.date.localeCompare(b.date)));
      setNewTermin({ title: "", date: "", time: "", location: "", notes: "" });
      setShowAdd(false);
    }
  }

  async function deleteTermin(id) {
    await supabase.from("termine").delete().eq("id", id);
    setTermine(termine.filter(t => t.id !== id));
  }

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Lade Termine…</div>;

  const upcoming = termine.filter(t => new Date(t.date) >= new Date());
  const past = termine.filter(t => new Date(t.date) < new Date());

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#00004a" }}>Termine</h2>
        {userRole === "admin" && (
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ padding: "8px 20px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            + Termin
          </button>
        )}
      </div>

      {showAdd && (
        <div style={{ background: "#f0f4ff", border: "1.5px solid #c7d2fe", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h4 style={{ margin: "0 0 16px", color: "#00004a" }}>Neuer Termin</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input value={newTermin.title} onChange={e => setNewTermin({ ...newTermin, title: e.target.value })}
              placeholder="Titel…" style={{ gridColumn: "1/-1", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
            <input type="date" value={newTermin.date} onChange={e => setNewTermin({ ...newTermin, date: e.target.value })}
              style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
            <input type="time" value={newTermin.time} onChange={e => setNewTermin({ ...newTermin, time: e.target.value })}
              style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
            <input value={newTermin.location} onChange={e => setNewTermin({ ...newTermin, location: e.target.value })}
              placeholder="Ort (optional)…" style={{ gridColumn: "1/-1", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
            <input value={newTermin.notes} onChange={e => setNewTermin({ ...newTermin, notes: e.target.value })}
              placeholder="Notizen (optional)…" style={{ gridColumn: "1/-1", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={addTermin} style={{ padding: "8px 20px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Speichern</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: "8px 16px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Abbrechen</button>
          </div>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p>Noch keine Termine geplant.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>BEVORSTEHEND</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {upcoming.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10 }}>
                <div style={{ textAlign: "center", background: "#00004a", color: "#fff", borderRadius: 8, padding: "6px 12px", minWidth: 50 }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{new Date(t.date).getDate()}</div>
                  <div style={{ fontSize: 11 }}>{new Date(t.date).toLocaleDateString("de-DE", { month: "short" })}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{t.title}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                    {t.time && `${t.time} Uhr`} {t.location && `· ${t.location}`}
                  </div>
                  {t.notes && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{t.notes}</div>}
                </div>
                {userRole === "admin" && (
                  <button onClick={() => deleteTermin(t.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 20 }}>×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#9ca3af", marginBottom: 12 }}>VERGANGEN</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {past.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 18px", background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, opacity: 0.7 }}>
                <div style={{ fontSize: 13, color: "#6b7280", minWidth: 80 }}>{formatDate(t.date)}</div>
                <div style={{ flex: 1, fontSize: 14, color: "#6b7280" }}>{t.title}</div>
                {userRole === "admin" && (
                  <button onClick={() => deleteTermin(t.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hausaufgaben ─────────────────────────────────────────────────────────────

function HausaufgabenArea({ tenant, userRole, profile }) {
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", description: "", due_date: "", assigned_to: "" });

  useEffect(() => { loadAll(); }, [tenant.id]);

  async function loadAll() {
    setLoading(true);
    const { data: ha } = await supabase.from("hausaufgaben").select("*, profiles(full_name)").eq("tenant_id", tenant.id).order("due_date");
    const { data: tm } = await supabase.from("tenant_members").select("*, profiles(id, full_name)").eq("tenant_id", tenant.id);
    setItems(ha || []);
    setMembers(tm || []);
    setLoading(false);
  }

  async function addItem() {
    if (!newItem.title) return;
    const { data, error } = await supabase.from("hausaufgaben").insert({
      tenant_id: tenant.id, ...newItem, done: false
    }).select("*, profiles(full_name)").single();
    if (!error && data) {
      setItems([...items, data]);
      setNewItem({ title: "", description: "", due_date: "", assigned_to: "" });
      setShowAdd(false);
    }
  }

  async function toggleDone(id, done) {
    await supabase.from("hausaufgaben").update({ done: !done }).eq("id", id);
    setItems(items.map(i => i.id === id ? { ...i, done: !done } : i));
  }

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Lade Hausaufgaben…</div>;

  const open = items.filter(i => !i.done);
  const done = items.filter(i => i.done);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#00004a" }}>Hausaufgaben</h2>
        {userRole === "admin" && (
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ padding: "8px 20px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            + Aufgabe
          </button>
        )}
      </div>

      {showAdd && (
        <div style={{ background: "#f0f4ff", border: "1.5px solid #c7d2fe", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <input value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })}
              placeholder="Aufgabe…" style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
            <input value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })}
              placeholder="Beschreibung (optional)…" style={{ padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <input type="date" value={newItem.due_date} onChange={e => setNewItem({ ...newItem, due_date: e.target.value })}
                style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
              <select value={newItem.assigned_to} onChange={e => setNewItem({ ...newItem, assigned_to: e.target.value })}
                style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}>
                <option value="">Zuweisung (optional)</option>
                {members.map(m => <option key={m.profiles?.id} value={m.profiles?.id}>{m.profiles?.full_name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addItem} style={{ padding: "8px 20px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Speichern</button>
              <button onClick={() => setShowAdd(false)} style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {open.length === 0 && done.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p>Noch keine Hausaufgaben.</p>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {open.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10 }}>
            <input type="checkbox" checked={false} onChange={() => toggleDone(item.id, item.done)}
              style={{ width: 18, height: 18, marginTop: 2, cursor: "pointer", accentColor: "#00004a" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{item.title}</div>
              {item.description && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{item.description}</div>}
              <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
                {item.due_date && <span>📅 {formatDate(item.due_date)}</span>}
                {item.profiles?.full_name && <span>👤 {item.profiles.full_name}</span>}
              </div>
            </div>
          </div>
        ))}
        {done.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", marginTop: 8, marginBottom: 4 }}>ERLEDIGT</div>
            {done.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, opacity: 0.6 }}>
                <input type="checkbox" checked={true} onChange={() => toggleDone(item.id, item.done)}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#00004a" }} />
                <span style={{ fontSize: 14, color: "#9ca3af", textDecoration: "line-through" }}>{item.title}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sprintboard ───────────────────────────────────────────────────────────────

function SprintboardArea({ tenant, userRole }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [dragId, setDragId] = useState(null);

  const COLS = [
    { key: "todo", label: "To Do", color: "#f1f5f9" },
    { key: "inprogress", label: "In Bearbeitung", color: "#fef9c3" },
    { key: "done", label: "Erledigt", color: "#dcfce7" },
  ];

  useEffect(() => { loadTasks(); }, [tenant.id]);

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase.from("sprint_tasks").select("*").eq("tenant_id", tenant.id).order("created_at");
    setTasks(data || []);
    setLoading(false);
  }

  async function addTask() {
    if (!newTask.trim()) return;
    const { data, error } = await supabase.from("sprint_tasks").insert({
      tenant_id: tenant.id, title: newTask, status: "todo"
    }).select().single();
    if (!error && data) { setTasks([...tasks, data]); setNewTask(""); }
  }

  async function moveTask(id, status) {
    await supabase.from("sprint_tasks").update({ status }).eq("id", id);
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
  }

  async function deleteTask(id) {
    await supabase.from("sprint_tasks").delete().eq("id", id);
    setTasks(tasks.filter(t => t.id !== id));
  }

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Lade Sprintboard…</div>;

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#00004a" }}>Sprintboard</h2>
      </div>
      {userRole === "admin" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <input value={newTask} onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
            placeholder="Neue Karte…"
            style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
          <button onClick={addTask} style={{ padding: "8px 20px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Hinzufügen</button>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {COLS.map(col => (
          <div key={col.key} style={{ background: col.color, borderRadius: 12, padding: 16, minHeight: 300 }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (dragId) moveTask(dragId, col.key); setDragId(null); }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 12 }}>
              {col.label} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({tasks.filter(t => t.status === col.key).length})</span>
            </div>
            {tasks.filter(t => t.status === col.key).map(task => (
              <div key={task.id}
                draggable
                onDragStart={() => setDragId(task.id)}
                style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", marginBottom: 8, border: "1.5px solid #e5e7eb", cursor: "grab", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, fontSize: 14, color: "#111827" }}>{task.title}</span>
                {userRole === "admin" && (
                  <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "#d1d5db", cursor: "pointer", fontSize: 16 }}>×</button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Team ─────────────────────────────────────────────────────────────────────

function TeamArea({ tenant, userRole }) {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => { loadAll(); }, [tenant.id]);

  async function loadAll() {
    setLoading(true);
    const { data: tm } = await supabase.from("tenant_members").select("*, profiles(full_name, email)").eq("tenant_id", tenant.id);
    const { data: inv } = await supabase.from("invitations").select("*").eq("tenant_id", tenant.id).eq("accepted", false).gt("expires_at", new Date().toISOString());
    setMembers(tm || []);
    setInvitations(inv || []);
    setLoading(false);
  }

  async function createInvite() {
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("invitations").insert({ tenant_id: tenant.id, token, expires_at: expires, accepted: false });
    if (!error) {
      const link = `${window.location.origin}?invite=${token}`;
      setInviteLink(link);
      loadAll();
    }
  }

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Lade Team…</div>;

  const roleLabel = { admin: "Admin/Coach", owner: "Inhaber", member: "Mitglied" };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#00004a" }}>Team</h2>
        {userRole === "admin" && (
          <button onClick={createInvite} style={{ padding: "8px 20px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            + Einladungslink
          </button>
        )}
      </div>

      {inviteLink && (
        <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#166534", marginBottom: 8 }}>Einladungslink erstellt:</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={inviteLink} readOnly style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, background: "#fff" }} />
            <button onClick={() => { navigator.clipboard.writeText(inviteLink); }}
              style={{ padding: "8px 14px", background: "#166534", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
              Kopieren
            </button>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Gültig für 7 Tage</div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {members.map(m => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10 }}>
            <div style={{ width: 40, height: 40, background: "#00004a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
              {(m.profiles?.full_name || "?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{m.profiles?.full_name || "Unbekannt"}</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>{m.profiles?.email}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: m.role === "admin" ? "#fef3c7" : "#f3f4f6", color: m.role === "admin" ? "#92400e" : "#374151" }}>
              {roleLabel[m.role] || m.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Übersicht (Dashboard des Projekts) ───────────────────────────────────────

function UebersichtArea({ tenant, userRole, onAmpelChange }) {
  const [phases, setPhases] = useState([]);
  const [modules, setModules] = useState([]);
  const [termine, setTermine] = useState([]);
  const [hausaufgaben, setHausaufgaben] = useState([]);
  const [ampel, setAmpel] = useState(tenant.ampel || "gruen");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [tenant.id]);

  async function loadAll() {
    setLoading(true);
    const [ph, mo, te, ha] = await Promise.all([
      supabase.from("phases").select("*, phase_steps(*)").eq("tenant_id", tenant.id),
      supabase.from("modules").select("*").eq("tenant_id", tenant.id).eq("active", true),
      supabase.from("termine").select("*").eq("tenant_id", tenant.id).gte("date", new Date().toISOString().split("T")[0]).order("date").limit(3),
      supabase.from("hausaufgaben").select("*").eq("tenant_id", tenant.id).eq("done", false).order("due_date").limit(5),
    ]);
    setPhases(ph.data || []);
    setModules(mo.data || []);
    setTermine(te.data || []);
    setHausaufgaben(ha.data || []);
    setLoading(false);
  }

  async function updateAmpel(value) {
    setAmpel(value);
    await supabase.from("tenants").update({ ampel: value }).eq("id", tenant.id);
    if (onAmpelChange) onAmpelChange(value);
  }

  const totalSteps = phases.reduce((sum, p) => sum + (p.phase_steps?.length || 0), 0);
  const doneSteps = phases.reduce((sum, p) => sum + (p.phase_steps?.filter(s => s.done)?.length || 0), 0);
  const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
  const currentPhase = phases.find(p => p.is_current);

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Lade Übersicht…</div>;

  return (
    <div style={{ padding: 28 }}>
      {/* Status-Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
        <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", marginBottom: 8 }}>PROJEKTSTATUS</div>
          {userRole === "admin" ? (
            <div style={{ display: "flex", gap: 8 }}>
              {["gruen", "gelb", "rot"].map(v => (
                <button key={v} onClick={() => updateAmpel(v)}
                  style={{ flex: 1, padding: "8px 0", border: `2px solid ${ampel === v ? ampelColor(v) : "#e5e7eb"}`, borderRadius: 8, background: ampel === v ? ampelColor(v) : "#f9fafb", cursor: "pointer", fontWeight: 600, fontSize: 12, color: ampel === v ? "#fff" : "#374151" }}>
                  {ampelLabel(v)}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: ampelColor(ampel) }} />
              <span style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{ampelLabel(ampel)}</span>
            </div>
          )}
        </div>

        <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", marginBottom: 8 }}>AKTUELLE PHASE</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#00004a" }}>
            {currentPhase ? PHASEN.find(p => p.key === currentPhase.phase_key)?.label || "—" : "—"}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", marginBottom: 8 }}>GESAMTFORTSCHRITT</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#00004a", marginBottom: 8 }}>{progress}%</div>
          <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#00004a", borderRadius: 4, transition: "width 0.5s" }} />
          </div>
        </div>
      </div>

      {/* Module-Übersicht */}
      {modules.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>AKTIVE MODULE</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {modules.map(m => (
              <div key={m.id} style={{ padding: "6px 14px", background: "#e0e7ff", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#3730a3" }}>
                {m.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nächste Termine */}
      {termine.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>NÄCHSTE TERMINE</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {termine.map(t => (
              <div key={t.id} style={{ display: "flex", gap: 14, padding: "10px 14px", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#00004a", minWidth: 80 }}>{formatDate(t.date)}</span>
                <span style={{ fontSize: 13, color: "#374151" }}>{t.title}</span>
                {t.time && <span style={{ fontSize: 13, color: "#9ca3af" }}>{t.time} Uhr</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offene Hausaufgaben */}
      {hausaufgaben.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>OFFENE AUFGABEN</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {hausaufgaben.map(ha => (
              <div key={ha.id} style={{ display: "flex", gap: 12, padding: "10px 14px", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>{ha.title}</span>
                {ha.due_date && <span style={{ fontSize: 12, color: new Date(ha.due_date) < new Date() ? "#ef4444" : "#9ca3af" }}>{formatDate(ha.due_date)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Projektraum ───────────────────────────────────────────────────────────────

function Projektraum({ tenant, userRole, profile, onBack }) {
  const [activeTab, setActiveTab] = useState("uebersicht");

  const TABS = [
    { key: "uebersicht", label: "Übersicht" },
    { key: "phasen", label: "Phasen" },
    { key: "module", label: "Module" },
    { key: "termine", label: "Termine" },
    { key: "hausaufgaben", label: "Hausaufgaben" },
    { key: "sprintboard", label: "Sprintboard" },
    { key: "team", label: "Team" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "#00004a", color: "#fff", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
        {userRole === "admin" && (
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#93c5fd", cursor: "pointer", fontSize: 13, padding: 0 }}>
            ← Alle Projekte
          </button>
        )}
        <div style={{ width: 1, height: 20, background: "#ffffff30" }} />
        <span style={{ fontWeight: 800, fontSize: 16 }}>{tenant.name}</span>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 13, color: "#93c5fd" }}>{profile?.full_name || profile?.email}</div>
      </div>

      {/* Navigation */}
      <div style={{ background: "#fff", borderBottom: "1.5px solid #e5e7eb", padding: "0 24px", display: "flex", gap: 0 }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "14px 18px", border: "none", background: "none", cursor: "pointer",
              fontSize: 14, fontWeight: activeTab === tab.key ? 700 : 400,
              color: activeTab === tab.key ? "#00004a" : "#6b7280",
              borderBottom: activeTab === tab.key ? "3px solid #c0003c" : "3px solid transparent",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inhalt */}
      <div>
        {activeTab === "uebersicht" && <UebersichtArea tenant={tenant} userRole={userRole} />}
        {activeTab === "phasen" && <PhasenArea tenant={tenant} userRole={userRole} />}
        {activeTab === "module" && <ModuleArea tenant={tenant} userRole={userRole} />}
        {activeTab === "termine" && <TermineArea tenant={tenant} userRole={userRole} />}
        {activeTab === "hausaufgaben" && <HausaufgabenArea tenant={tenant} userRole={userRole} profile={profile} />}
        {activeTab === "sprintboard" && <SprintboardArea tenant={tenant} userRole={userRole} />}
        {activeTab === "team" && <TeamArea tenant={tenant} userRole={userRole} />}
      </div>
    </div>
  );
}

// ── Admin-Übersicht ──────────────────────────────────────────────────────────

function AdminOverview({ profile, onSelectTenant, onLogout }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: "", description: "" });
  const [filter, setFilter] = useState("");

  useEffect(() => { loadTenants(); }, []);

  async function loadTenants() {
    setLoading(true);
    const { data } = await supabase.from("tenants").select("*").order("name");
    setTenants(data || []);
    setLoading(false);
  }

  async function createTenant() {
    if (!newTenant.name.trim()) return;
    const { data, error } = await supabase.from("tenants").insert({
      name: newTenant.name, description: newTenant.description, ampel: "gruen"
    }).select().single();
    if (!error && data) {
      // Phasen automatisch anlegen
      await supabase.from("phases").insert(
        PHASEN.map((ph, i) => ({ tenant_id: data.id, phase_key: ph.key, is_current: i === 0 }))
      );
      setTenants([...tenants, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTenant({ name: "", description: "" });
      setShowCreate(false);
    }
  }

  const filtered = tenants.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "#00004a", color: "#fff", padding: "0 28px", display: "flex", alignItems: "center", height: 56 }}>
        <div style={{ width: 32, height: 32, background: "#c0003c", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <span style={{ fontWeight: 900, fontSize: 14 }}>IC</span>
        </div>
        <span style={{ fontWeight: 800, fontSize: 16 }}>INQA-Coaching</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: "#93c5fd", marginRight: 20 }}>{profile?.full_name || profile?.email}</span>
        <button onClick={onLogout} style={{ background: "none", border: "1px solid #ffffff40", color: "#fff", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 13 }}>
          Abmelden
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#00004a" }}>Alle Projekte</h1>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>{tenants.length} Mandant{tenants.length !== 1 ? "en" : ""}</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            style={{ padding: "10px 22px", background: "#c0003c", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            + Neues Projekt
          </button>
        </div>

        {showCreate && (
          <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 14, padding: 24, marginBottom: 28 }}>
            <h3 style={{ margin: "0 0 16px", color: "#00004a" }}>Neues Projekt anlegen</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={newTenant.name} onChange={e => setNewTenant({ ...newTenant, name: e.target.value })}
                placeholder="Unternehmensname…"
                style={{ padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 15 }} />
              <input value={newTenant.description} onChange={e => setNewTenant({ ...newTenant, description: e.target.value })}
                placeholder="Kurze Beschreibung (optional)…"
                style={{ padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={createTenant} style={{ padding: "10px 24px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Anlegen</button>
                <button onClick={() => setShowCreate(false)} style={{ padding: "10px 18px", background: "#f3f4f6", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Abbrechen</button>
              </div>
            </div>
          </div>
        )}

        {/* Suchfilter */}
        <input value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="Projekte suchen…"
          style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: "border-box" }} />

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Lade Projekte…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p>Noch keine Projekte vorhanden.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map(tenant => (
              <button key={tenant.id} onClick={() => onSelectTenant(tenant)}
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 22px", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#00004a"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e7eb"}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: ampelColor(tenant.ampel), flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{tenant.name}</div>
                  {tenant.description && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{tenant.description}</div>}
                </div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>{ampelLabel(tenant.ampel)}</div>
                <div style={{ fontSize: 20, color: "#d1d5db" }}>→</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Einladungs-Handling ──────────────────────────────────────────────────────

async function handleInviteToken(token, userId) {
  const { data: inv } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .eq("accepted", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!inv) return false;

  const { error } = await supabase.from("tenant_members").insert({
    tenant_id: inv.tenant_id, user_id: userId, role: "member"
  });

  if (!error) {
    await supabase.from("invitations").update({ accepted: true }).eq("id", inv.id);
    window.history.replaceState({}, "", window.location.pathname);
    return inv.tenant_id;
  }
  return false;
}

// ── Haupt-App ────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState(null); // "admin" | "owner" | "member"
  const [tenantMemberships, setTenantMemberships] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) init(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) init(session.user);
      else { setProfile(null); setUserRole(null); setTenantMemberships([]); setSelectedTenant(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function init(user) {
    setLoading(true);

    // Einladungstoken verarbeiten
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite");
    if (inviteToken) {
      await handleInviteToken(inviteToken, user.id);
    }

    // Profil laden
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(prof || { id: user.id, email: user.email, full_name: user.email });

    // Mitgliedschaften laden
    const { data: memberships } = await supabase
      .from("tenant_members")
      .select("*, tenants(*)")
      .eq("user_id", user.id);

    setTenantMemberships(memberships || []);

    // Rolle bestimmen
    const isAdmin = memberships?.some(m => m.role === "admin") || prof?.is_admin;
    if (isAdmin) {
      setUserRole("admin");
    } else if (memberships?.length === 1) {
      setUserRole(memberships[0].role);
      setSelectedTenant(memberships[0].tenants);
    } else if (memberships?.length > 1) {
      setUserRole("member");
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSelectedTenant(null);
    setUserRole(null);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, background: "#00004a", borderRadius: 12, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#c0003c", fontSize: 22, fontWeight: 900 }}>IC</span>
          </div>
          <p style={{ color: "#6b7280" }}>Wird geladen…</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  // Admin sieht Gesamtübersicht oder springt in Projektraum
  if (userRole === "admin") {
    if (selectedTenant) {
      return (
        <Projektraum
          tenant={selectedTenant}
          userRole="admin"
          profile={profile}
          onBack={() => setSelectedTenant(null)}
        />
      );
    }
    return (
      <AdminOverview
        profile={profile}
        onSelectTenant={setSelectedTenant}
        onLogout={logout}
      />
    );
  }

  // Kunde sieht direkt seinen Projektraum
  if (selectedTenant) {
    return (
      <Projektraum
        tenant={selectedTenant}
        userRole={userRole || "member"}
        profile={profile}
        onBack={null}
      />
    );
  }

  // Kein Tenant zugeordnet
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: "#00004a", marginBottom: 12 }}>Kein Projektzugang</h2>
        <p style={{ color: "#6b7280", marginBottom: 24 }}>Du bist noch keinem Projekt zugeordnet. Bitte nutze den Einladungslink deines Coaches.</p>
        <button onClick={logout} style={{ padding: "10px 24px", background: "#00004a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Abmelden
        </button>
      </div>
    </div>
  );
}
