"use client";

import { useState, useEffect, useMemo } from "react";
import Cookies from "js-cookie";

const COLUMNS = [
  { id: "todo", title: "À faire", color: "bg-gray-500", text: "text-gray-400", light: "bg-gray-500/15" },
  { id: "in-progress", title: "En cours", color: "bg-blue-500", text: "text-blue-400", light: "bg-blue-500/15" },
  { id: "review", title: "Relecture", color: "bg-amber-500", text: "text-amber-400", light: "bg-amber-500/15" },
  { id: "done", title: "Terminé", color: "bg-emerald-500", text: "text-emerald-400", light: "bg-emerald-500/15" },
];

const PRIORITY_CONFIG = {
  low:    { label: "Basse",   color: "bg-gray-500",   text: "text-gray-400",   light: "bg-gray-500/15" },
  medium: { label: "Moyenne", color: "bg-blue-500",   text: "text-blue-400",   light: "bg-blue-500/15" },
  high:   { label: "Haute",   color: "bg-orange-500", text: "text-orange-400", light: "bg-orange-500/15" },
  urgent: { label: "Urgente", color: "bg-red-500",    text: "text-red-400",    light: "bg-red-500/15" },
};

const TYPE_COLORS = {
  "Light Novel": { color: "bg-purple-500", text: "text-purple-400", light: "bg-purple-500/15" },
  "Web Novel":   { color: "bg-blue-500",   text: "text-blue-400",   light: "bg-blue-500/15" },
  "Manga":       { color: "bg-pink-500",   text: "text-pink-400",   light: "bg-pink-500/15" },
  "Manhwa":      { color: "bg-cyan-500",   text: "text-cyan-400",   light: "bg-cyan-500/15" },
  "Manhua":      { color: "bg-emerald-500", text: "text-emerald-400", light: "bg-emerald-500/15" },
};

const ETAT_COLORS = {
  "En cours":  { color: "bg-blue-500",    text: "text-blue-400",    light: "bg-blue-500/15" },
  "Terminé":   { color: "bg-emerald-500", text: "text-emerald-400", light: "bg-emerald-500/15" },
  "En pause":  { color: "bg-amber-500",   text: "text-amber-400",   light: "bg-amber-500/15" },
  "Abandonné": { color: "bg-red-500",     text: "text-red-400",     light: "bg-red-500/15" },
};

export default function TeamGraphiques({ team }) {
  const [section, setSection] = useState("taches");
  const [tasks, setTasks] = useState([]);
  const [chapterCounts, setChapterCounts] = useState({});
  const [loadingChapters, setLoadingChapters] = useState(false);

  // --- Visibilité ---
  const [trackingData, setTrackingData] = useState(null);
  const [trackingAvailable, setTrackingAvailable] = useState(null); // null=loading, true/false
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [period, setPeriod] = useState("total");
  const [expandedOeuvre, setExpandedOeuvre] = useState(null);
  const [oeuvreChapters, setOeuvreChapters] = useState({});
  const [loadingOeuvreChapters, setLoadingOeuvreChapters] = useState(null);

  const oeuvres = team.oeuvres || [];
  const storageKey = `kanban-v2-${team.documentId}`;

  // Charger les tâches kanban
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setTasks(JSON.parse(raw));
    } catch (e) {
      console.error("Graphiques load error:", e);
    }
  }, [storageKey]);

  // Charger le nombre de chapitres par œuvre
  useEffect(() => {
    if (section !== "oeuvres" || oeuvres.length === 0) return;
    if (Object.keys(chapterCounts).length > 0) return;

    const fetchCounts = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) return;
      setLoadingChapters(true);
      const counts = {};
      try {
        await Promise.all(
          oeuvres.map(async (o) => {
            try {
              const res = await fetch(
                `/api/proxy/chapitres?filters[oeuvres][documentId][$eq]=${o.documentId}&pagination[pageSize]=1`,
                { headers: { Authorization: `Bearer ${jwt}` } }
              );
              const data = await res.json();
              counts[o.documentId] = data.meta?.pagination?.total || 0;
            } catch {
              counts[o.documentId] = 0;
            }
          })
        );
      } catch (e) {
        console.error("Chapter count error:", e);
      }
      setChapterCounts(counts);
      setLoadingChapters(false);
    };
    fetchCounts();
  }, [section, oeuvres, chapterCounts]);

  // --- Charger les données de tracking (visibilité) ---
  useEffect(() => {
    if (section !== "visibilite" || oeuvres.length === 0) return;
    if (trackingData !== null) return;

    const fetchTracking = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) { setTrackingAvailable(false); return; }
      setLoadingTracking(true);
      try {
        const oeuvreIds = oeuvres.map((o) => o.documentId);
        const filters = oeuvreIds.map((id, i) => `filters[oeuvreId][$in][${i}]=${id}`).join("&");
        const res = await fetch(
          `/api/proxy/suivis?${filters}&fields[0]=type&fields[1]=cibleType&fields[2]=cibleId&fields[3]=oeuvreId&fields[4]=createdAt&pagination[pageSize]=10000&sort=createdAt:desc`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        if (res.ok) {
          const json = await res.json();
          setTrackingData(json.data || []);
          setTrackingAvailable(true);
        } else {
          setTrackingData([]);
          setTrackingAvailable(false);
        }
      } catch {
        setTrackingData([]);
        setTrackingAvailable(false);
      }
      setLoadingTracking(false);
    };
    fetchTracking();
  }, [section, oeuvres, trackingData]);

  // --- Charger les chapitres quand on déplie une œuvre ---
  useEffect(() => {
    if (!expandedOeuvre || oeuvreChapters[expandedOeuvre]) return;
    const fetchChaps = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) return;
      setLoadingOeuvreChapters(expandedOeuvre);
      try {
        let page = 1, all = [], pageCount = 1;
        do {
          const res = await fetch(
            `/api/proxy/chapitres?filters[oeuvres][documentId][$eq]=${expandedOeuvre}&fields[0]=titre&fields[1]=order&fields[2]=documentId&sort=order:asc&pagination[page]=${page}&pagination[pageSize]=100`,
            { headers: { Authorization: `Bearer ${jwt}` } }
          );
          const json = await res.json();
          all = [...all, ...(json.data || [])];
          pageCount = json.meta?.pagination?.pageCount || 1;
          page++;
        } while (page <= pageCount);
        setOeuvreChapters((prev) => ({ ...prev, [expandedOeuvre]: all }));
      } catch (e) {
        console.error("Fetch chapters error:", e);
        setOeuvreChapters((prev) => ({ ...prev, [expandedOeuvre]: [] }));
      }
      setLoadingOeuvreChapters(null);
    };
    fetchChaps();
  }, [expandedOeuvre, oeuvreChapters]);

  // --- Stats tracking ---
  const trackingStats = useMemo(() => {
    const events = trackingData || [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    const count = (arr, type, periodKey) => {
      let filtered = arr.filter((e) => e.type === type);
      if (periodKey === "semaine") filtered = filtered.filter((e) => new Date(e.createdAt) >= weekAgo);
      if (periodKey === "mois") filtered = filtered.filter((e) => new Date(e.createdAt) >= monthAgo);
      return filtered.length;
    };

    const perOeuvre = oeuvres.map((o) => {
      const oEvents = events.filter((e) => e.oeuvreId === o.documentId);
      return {
        ...o,
        vues: { total: count(oEvents, "vue", "total"), semaine: count(oEvents, "vue", "semaine"), mois: count(oEvents, "vue", "mois") },
        likes: { total: count(oEvents, "like", "total"), semaine: count(oEvents, "like", "semaine"), mois: count(oEvents, "like", "mois") },
        abonnes: { total: count(oEvents, "abonne", "total"), semaine: count(oEvents, "abonne", "semaine"), mois: count(oEvents, "abonne", "mois") },
      };
    });

    const totals = { vues: { total: 0, semaine: 0, mois: 0 }, likes: { total: 0, semaine: 0, mois: 0 }, abonnes: { total: 0, semaine: 0, mois: 0 } };
    perOeuvre.forEach((o) => {
      ["vues", "likes", "abonnes"].forEach((k) => {
        ["total", "semaine", "mois"].forEach((p) => { totals[k][p] += o[k][p]; });
      });
    });

    // Chapter-level view stats
    const chapterViews = (oeuvreId) => {
      const chapEvents = events.filter((e) => e.oeuvreId === oeuvreId && e.cibleType === "chapitre" && e.type === "vue");
      const map = {};
      chapEvents.forEach((e) => {
        if (!map[e.cibleId]) map[e.cibleId] = [];
        map[e.cibleId].push(e);
      });
      return map;
    };

    return { perOeuvre, totals, chapterViews };
  }, [trackingData, oeuvres]);

  // --- Stats tâches ---
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.column === "done").length;
    const inProgress = tasks.filter((t) => t.column === "in-progress").length;
    const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.column !== "done").length;
    const totalComments = tasks.reduce((sum, t) => sum + (t.comments?.length || 0), 0);
    const totalLinks = tasks.reduce((sum, t) => sum + (t.links?.length || 0), 0);
    const withChecklist = tasks.filter((t) => t.checklist?.length > 0);
    const totalCheckItems = withChecklist.reduce((sum, t) => sum + t.checklist.length, 0);
    const doneCheckItems = withChecklist.reduce((sum, t) => sum + t.checklist.filter((c) => c.done).length, 0);

    const byColumn = COLUMNS.map((col) => ({
      ...col,
      count: tasks.filter((t) => t.column === col.id).length,
      pct: total ? Math.round((tasks.filter((t) => t.column === col.id).length / total) * 100) : 0,
    }));

    const byPriority = Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => ({
      key, ...cfg,
      count: tasks.filter((t) => t.priority === key).length,
      pct: total ? Math.round((tasks.filter((t) => t.priority === key).length / total) * 100) : 0,
    }));

    const assigneeMap = {};
    tasks.forEach((t) => {
      const name = t.assignee || "Non assigné";
      assigneeMap[name] = (assigneeMap[name] || 0) + 1;
    });
    const byAssignee = Object.entries(assigneeMap)
      .map(([name, count]) => ({ name, count, pct: total ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    const tagMap = {};
    tasks.forEach((t) => (t.tags || []).forEach((tag) => { tagMap[tag] = (tagMap[tag] || 0) + 1; }));
    const byTag = Object.entries(tagMap).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 10);

    const now = new Date();
    const activity = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split("T")[0];
      const count = tasks.filter((t) => t.createdAt && t.createdAt.startsWith(dayStr)).length;
      activity.push({ date: day.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), count, dayStr });
    }
    const activityMax = Math.max(...activity.map((a) => a.count), 1);

    return {
      total, done, inProgress, overdue, totalComments, totalLinks,
      totalCheckItems, doneCheckItems,
      byColumn, byPriority, byAssignee, byTag, activity, activityMax,
      completionPct: total ? Math.round((done / total) * 100) : 0,
      checkPct: totalCheckItems ? Math.round((doneCheckItems / totalCheckItems) * 100) : 0,
    };
  }, [tasks]);

  // --- Stats œuvres ---
  const oeuvreStats = useMemo(() => {
    const total = oeuvres.length;
    const totalChapters = Object.values(chapterCounts).reduce((s, c) => s + c, 0);

    const contributorSet = new Set();
    oeuvres.forEach((o) => (o.users || []).forEach((u) => contributorSet.add(u.username || u.id)));
    const totalContributors = contributorSet.size;

    // Par type
    const typeMap = {};
    oeuvres.forEach((o) => { const t = o.type || "Autre"; typeMap[t] = (typeMap[t] || 0) + 1; });
    const byType = Object.entries(typeMap).map(([type, count]) => ({
      type, count, pct: total ? Math.round((count / total) * 100) : 0,
      ...(TYPE_COLORS[type] || { color: "bg-gray-500", text: "text-gray-400", light: "bg-gray-500/15" }),
    })).sort((a, b) => b.count - a.count);

    // Par état
    const etatMap = {};
    oeuvres.forEach((o) => { const e = o.etat || "Non défini"; etatMap[e] = (etatMap[e] || 0) + 1; });
    const byEtat = Object.entries(etatMap).map(([etat, count]) => ({
      etat, count, pct: total ? Math.round((count / total) * 100) : 0,
      ...(ETAT_COLORS[etat] || { color: "bg-gray-500", text: "text-gray-400", light: "bg-gray-500/15" }),
    })).sort((a, b) => b.count - a.count);

    // Par contributeur
    const contribMap = {};
    oeuvres.forEach((o) => {
      (o.users || []).forEach((u) => {
        const name = u.username || `User ${u.id}`;
        if (!contribMap[name]) contribMap[name] = { count: 0, oeuvres: [] };
        contribMap[name].count++;
        contribMap[name].oeuvres.push(o.titre);
      });
    });
    const byContributor = Object.entries(contribMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    // Œuvres triées par chapitres (top 10)
    const byChapters = oeuvres
      .map((o) => ({ ...o, chapters: chapterCounts[o.documentId] || 0 }))
      .sort((a, b) => b.chapters - a.chapters)
      .slice(0, 10);

    // Activité création (12 derniers mois)
    const now = new Date();
    const monthActivity = [];
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = month.toISOString().slice(0, 7);
      const count = oeuvres.filter((o) => o.createdAt && o.createdAt.startsWith(monthStr)).length;
      monthActivity.push({
        label: month.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        count,
      });
    }
    const monthMax = Math.max(...monthActivity.map((m) => m.count), 1);

    // Œuvres récemment mises à jour
    const recentlyUpdated = [...oeuvres]
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 5);

    const enCours = oeuvres.filter((o) => o.etat === "En cours").length;
    const terminees = oeuvres.filter((o) => o.etat === "Terminé").length;

    return {
      total, totalChapters, totalContributors, enCours, terminees,
      byType, byEtat, byContributor, byChapters,
      monthActivity, monthMax, recentlyUpdated,
    };
  }, [oeuvres, chapterCounts]);

  const hasTaskData = tasks.length > 0;
  const hasOeuvreData = oeuvres.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 rounded-xl border border-emerald-500/10">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Tableau de bord</h2>
            <p className="text-sm text-gray-400">
              {taskStats.total} tâche{taskStats.total !== 1 ? "s" : ""} · {oeuvres.length} œuvre{oeuvres.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex bg-gray-800/40 rounded-xl p-1 border border-gray-700/30">
          <button
            onClick={() => setSection("taches")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              section === "taches"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Tâches
          </button>
          <button
            onClick={() => setSection("oeuvres")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              section === "oeuvres"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Œuvres
          </button>
          <button
            onClick={() => setSection("visibilite")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              section === "visibilite"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Visibilité
          </button>

        </div>
      </div>

      {/* ═══════════════════ SECTION TÂCHES ═══════════════════ */}
      {section === "taches" && (
        <>
          {!hasTaskData ? (
            <EmptyState
              icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              title="Aucune donnée"
              subtitle={"Créez des tâches dans l'onglet Tâches pour voir les statistiques"}
            />
          ) : (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPICard label="Total" value={taskStats.total} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" color="text-indigo-400" bg="bg-indigo-500/10" />
                <KPICard label="Terminées" value={taskStats.done} icon="M5 13l4 4L19 7" color="text-emerald-400" bg="bg-emerald-500/10" suffix={taskStats.completionPct > 0 ? `${taskStats.completionPct}%` : null} />
                <KPICard label="En cours" value={taskStats.inProgress} icon="M13 10V3L4 14h7v7l9-11h-7z" color="text-blue-400" bg="bg-blue-500/10" />
                <KPICard label="En retard" value={taskStats.overdue} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" color={taskStats.overdue > 0 ? "text-red-400" : "text-gray-400"} bg={taskStats.overdue > 0 ? "bg-red-500/10" : "bg-gray-500/10"} />
                <KPICard label="Commentaires" value={taskStats.totalComments} icon="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" color="text-purple-400" bg="bg-purple-500/10" />
                <KPICard label="Liens" value={taskStats.totalLinks} icon="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" color="text-cyan-400" bg="bg-cyan-500/10" />
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Donut - Répartition par statut */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" title="Répartition par statut" />
                  <div className="flex items-center gap-8">
                    <div className="relative w-40 h-40 flex-shrink-0">
                      <div
                        className="w-full h-full rounded-full"
                        style={{
                          background: `conic-gradient(
                            #6b7280 0deg ${taskStats.byColumn[0].pct * 3.6}deg,
                            #3b82f6 ${taskStats.byColumn[0].pct * 3.6}deg ${(taskStats.byColumn[0].pct + taskStats.byColumn[1].pct) * 3.6}deg,
                            #f59e0b ${(taskStats.byColumn[0].pct + taskStats.byColumn[1].pct) * 3.6}deg ${(taskStats.byColumn[0].pct + taskStats.byColumn[1].pct + taskStats.byColumn[2].pct) * 3.6}deg,
                            #10b981 ${(taskStats.byColumn[0].pct + taskStats.byColumn[1].pct + taskStats.byColumn[2].pct) * 3.6}deg 360deg
                          )`,
                        }}
                      />
                      <div className="absolute inset-4 bg-gray-900/90 rounded-full flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-white">{taskStats.completionPct}%</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Complété</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      {taskStats.byColumn.map((col) => (
                        <div key={col.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-3 h-3 rounded-full ${col.color}`} />
                            <span className="text-sm text-gray-300">{col.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{col.count}</span>
                            <span className="text-xs text-gray-600 w-10 text-right">{col.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Barres - Répartition par priorité */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" title="Répartition par priorité" />
                  <div className="space-y-4">
                    {taskStats.byPriority.map((pri) => {
                      const maxCount = Math.max(...taskStats.byPriority.map((p) => p.count), 1);
                      const barPct = (pri.count / maxCount) * 100;
                      return (
                        <div key={pri.key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-sm font-medium ${pri.text}`}>{pri.label}</span>
                            <span className="text-sm text-gray-400 font-mono">{pri.count}</span>
                          </div>
                          <div className="h-3 bg-gray-800/60 rounded-full overflow-hidden">
                            <div className={`h-full ${pri.color} rounded-full transition-all duration-700`} style={{ width: `${barPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Charge par membre */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" title="Charge par membre" />
                  <div className="space-y-3">
                    {taskStats.byAssignee.map((member) => {
                      const maxCount = Math.max(...taskStats.byAssignee.map((m) => m.count), 1);
                      const barPct = (member.count / maxCount) * 100;
                      const isUnassigned = member.name === "Non assigné";
                      return (
                        <div key={member.name} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isUnassigned ? "bg-gray-700/50 text-gray-400" : "bg-gradient-to-br from-indigo-500 to-purple-500 text-white"}`}>
                            {isUnassigned ? "?" : member.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm truncate ${isUnassigned ? "text-gray-400 italic" : "text-gray-300"}`}>{member.name}</span>
                              <span className="text-sm text-gray-400 font-mono ml-2">{member.count}</span>
                            </div>
                            <div className="h-2 bg-gray-800/60 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${isUnassigned ? "bg-gray-600" : "bg-gradient-to-r from-indigo-500 to-purple-500"}`} style={{ width: `${barPct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {taskStats.byAssignee.length === 0 && <p className="text-sm text-gray-600 italic text-center py-4">Aucune tâche assignée</p>}
                  </div>
                </div>

                {/* Activité 14 jours */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" title="Activité (14 derniers jours)" />
                  <div className="flex items-end gap-1.5 h-36">
                    {taskStats.activity.map((day, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="w-full flex flex-col justify-end h-28">
                          <div
                            className={`w-full rounded-t-md transition-all duration-300 ${day.count > 0 ? "bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300" : "bg-gray-800/30"}`}
                            style={{ height: `${Math.max((day.count / taskStats.activityMax) * 100, day.count > 0 ? 12 : 4)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-600 truncate w-full text-center">{day.date}</span>
                        {day.count > 0 && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {day.count} tâche{day.count > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section inférieure */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Progression */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" title="Progression" />
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm text-gray-400">Tâches terminées</span>
                        <span className="text-sm font-mono text-white">{taskStats.done}/{taskStats.total}</span>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${taskStats.completionPct}%` }} />
                      </div>
                    </div>
                    {taskStats.totalCheckItems > 0 && (
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm text-gray-400">Checklist items</span>
                          <span className="text-sm font-mono text-white">{taskStats.doneCheckItems}/{taskStats.totalCheckItems}</span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500" style={{ width: `${taskStats.checkPct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags populaires */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" title="Tags populaires" />
                  {taskStats.byTag.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {taskStats.byTag.map((t) => (
                        <span key={t.tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/15 text-sm">
                          {t.tag}
                          <span className="text-xs bg-indigo-500/20 px-1.5 py-0.5 rounded-md font-mono">{t.count}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 italic text-center py-4">Aucun tag utilisé</p>
                  )}
                </div>

                {/* Tâches en retard */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" title="En retard" />
                  {taskStats.overdue > 0 ? (
                    <div className="space-y-2">
                      {tasks
                        .filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.column !== "done")
                        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                        .slice(0, 5)
                        .map((t) => {
                          const daysLate = Math.ceil((Date.now() - new Date(t.dueDate).getTime()) / 86400000);
                          return (
                            <div key={t.id} className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{t.title}</p>
                                <p className="text-xs text-red-400">{daysLate} jour{daysLate > 1 ? "s" : ""} de retard</p>
                              </div>
                              {t.assignee && (
                                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0">
                                  {t.assignee[0]?.toUpperCase()}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 text-gray-600">
                      <svg className="w-10 h-10 mb-2 text-emerald-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm text-gray-400">Aucune tâche en retard</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tableau récapitulatif */}
              <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                <SectionTitle icon="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" title={"Vue d'ensemble par membre"} />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800/50">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Membre</th>
                        {COLUMNS.map((col) => <th key={col.id} className={`text-center py-3 px-3 font-medium ${col.text}`}>{col.title}</th>)}
                        <th className="text-center py-3 px-3 text-gray-400 font-medium">Total</th>
                        <th className="text-center py-3 px-3 text-gray-400 font-medium">Progression</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskStats.byAssignee.map((member) => {
                        const memberTasks = tasks.filter((t) => (t.assignee || "Non assigné") === member.name);
                        const memberDone = memberTasks.filter((t) => t.column === "done").length;
                        const memberPct = memberTasks.length ? Math.round((memberDone / memberTasks.length) * 100) : 0;
                        return (
                          <tr key={member.name} className="border-b border-gray-800/20 hover:bg-white/[0.02]">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${member.name === "Non assigné" ? "bg-gray-700/50 text-gray-400" : "bg-gradient-to-br from-indigo-500 to-purple-500 text-white"}`}>
                                  {member.name === "Non assigné" ? "?" : member.name[0]?.toUpperCase()}
                                </div>
                                <span className={member.name === "Non assigné" ? "text-gray-400 italic" : "text-gray-300"}>{member.name}</span>
                              </div>
                            </td>
                            {COLUMNS.map((col) => (
                              <td key={col.id} className="text-center py-3 px-3 text-gray-400">
                                {memberTasks.filter((t) => t.column === col.id).length || <span className="text-gray-700">0</span>}
                              </td>
                            ))}
                            <td className="text-center py-3 px-3 text-white font-semibold">{member.count}</td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${memberPct}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 font-mono w-8">{memberPct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════ SECTION ŒUVRES ═══════════════════ */}
      {section === "oeuvres" && (
        <>
          {!hasOeuvreData ? (
            <EmptyState
              icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              title="Aucune œuvre"
              subtitle="Ajoutez des œuvres à la team pour voir les statistiques"
            />
          ) : (
            <div className="space-y-6">
              {/* KPI Cards œuvres */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <KPICard label="Œuvres" value={oeuvreStats.total} icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" color="text-indigo-400" bg="bg-indigo-500/10" />
                <KPICard label="Chapitres" value={loadingChapters ? "..." : oeuvreStats.totalChapters} icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" color="text-purple-400" bg="bg-purple-500/10" />
                <KPICard label="Contributeurs" value={oeuvreStats.totalContributors} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" color="text-cyan-400" bg="bg-cyan-500/10" />
                <KPICard label="En cours" value={oeuvreStats.enCours} icon="M13 10V3L4 14h7v7l9-11h-7z" color="text-blue-400" bg="bg-blue-500/10" />
                <KPICard label="Terminées" value={oeuvreStats.terminees} icon="M5 13l4 4L19 7" color="text-emerald-400" bg="bg-emerald-500/10" />
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Donut - Répartition par type */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" title="Répartition par type" />
                  {oeuvreStats.byType.length > 0 ? (
                    <div className="flex items-center gap-8">
                      <div className="relative w-40 h-40 flex-shrink-0">
                        <div
                          className="w-full h-full rounded-full"
                          style={{
                            background: (() => {
                              const colors = ["#a855f7", "#3b82f6", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#6b7280"];
                              let segments = "";
                              let acc = 0;
                              oeuvreStats.byType.forEach((t, i) => {
                                const start = acc * 3.6;
                                acc += t.pct;
                                const end = acc * 3.6;
                                segments += `${colors[i % colors.length]} ${start}deg ${end}deg${i < oeuvreStats.byType.length - 1 ? "," : ""}`;
                              });
                              return `conic-gradient(${segments})`;
                            })(),
                          }}
                        />
                        <div className="absolute inset-4 bg-gray-900/90 rounded-full flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-white">{oeuvreStats.total}</span>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Œuvres</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        {oeuvreStats.byType.map((t) => (
                          <div key={t.type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-3 h-3 rounded-full ${t.color}`} />
                              <span className="text-sm text-gray-300">{t.type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{t.count}</span>
                              <span className="text-xs text-gray-600 w-10 text-right">{t.pct}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 italic text-center py-8">Aucune donnée de type</p>
                  )}
                </div>

                {/* Barres - Répartition par état */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" title="Répartition par état" />
                  <div className="space-y-4">
                    {oeuvreStats.byEtat.map((e) => {
                      const maxCount = Math.max(...oeuvreStats.byEtat.map((x) => x.count), 1);
                      const barPct = (e.count / maxCount) * 100;
                      return (
                        <div key={e.etat}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-sm font-medium ${e.text}`}>{e.etat}</span>
                            <span className="text-sm text-gray-400 font-mono">{e.count}</span>
                          </div>
                          <div className="h-3 bg-gray-800/60 rounded-full overflow-hidden">
                            <div className={`h-full ${e.color} rounded-full transition-all duration-700`} style={{ width: `${barPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {oeuvreStats.byEtat.length === 0 && <p className="text-sm text-gray-600 italic text-center py-4">Aucune donnée</p>}
                  </div>
                </div>

                {/* Chapitres par œuvre */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" title="Chapitres par œuvre" />
                  {loadingChapters ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {oeuvreStats.byChapters.map((o) => {
                        const maxCh = Math.max(...oeuvreStats.byChapters.map((x) => x.chapters), 1);
                        const barPct = (o.chapters / maxCh) * 100;
                        return (
                          <div key={o.documentId}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-300 truncate max-w-[70%]">{o.titre}</span>
                              <span className="text-sm text-gray-400 font-mono ml-2">{o.chapters}</span>
                            </div>
                            <div className="h-2.5 bg-gray-800/60 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700" style={{ width: `${barPct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      {oeuvreStats.byChapters.length === 0 && <p className="text-sm text-gray-600 italic text-center py-4">Aucun chapitre</p>}
                    </div>
                  )}
                </div>

                {/* Contributeurs */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" title="Contributeurs" />
                  <div className="space-y-3">
                    {oeuvreStats.byContributor.map((c) => {
                      const maxCount = Math.max(...oeuvreStats.byContributor.map((x) => x.count), 1);
                      const barPct = (c.count / maxCount) * 100;
                      return (
                        <div key={c.name} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {c.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-300 truncate">{c.name}</span>
                              <span className="text-sm text-gray-400 font-mono ml-2">{c.count} œuvre{c.count > 1 ? "s" : ""}</span>
                            </div>
                            <div className="h-2 bg-gray-800/60 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700" style={{ width: `${barPct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {oeuvreStats.byContributor.length === 0 && <p className="text-sm text-gray-600 italic text-center py-4">Aucun contributeur</p>}
                  </div>
                </div>
              </div>

              {/* Section inférieure œuvres */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activité (12 derniers mois) */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" title="Créations (12 derniers mois)" />
                  <div className="flex items-end gap-2 h-36">
                    {oeuvreStats.monthActivity.map((m, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="w-full flex flex-col justify-end h-28">
                          <div
                            className={`w-full rounded-t-md transition-all duration-300 ${m.count > 0 ? "bg-gradient-to-t from-purple-600 to-purple-400 group-hover:from-purple-500 group-hover:to-purple-300" : "bg-gray-800/30"}`}
                            style={{ height: `${Math.max((m.count / oeuvreStats.monthMax) * 100, m.count > 0 ? 12 : 4)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-600 truncate w-full text-center">{m.label}</span>
                        {m.count > 0 && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {m.count} œuvre{m.count > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dernières mises à jour */}
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" title="Dernières mises à jour" />
                  <div className="space-y-2.5">
                    {oeuvreStats.recentlyUpdated.map((o) => {
                      const coverUrl = Array.isArray(o.couverture) ? o.couverture?.[0]?.url : o.couverture?.url;
                      const updDate = o.updatedAt ? new Date(o.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
                      return (
                        <div key={o.documentId} className="flex items-center gap-3 p-3 bg-gray-800/25 rounded-xl border border-gray-800/30 hover:border-gray-700/40 transition-colors">
                          {coverUrl ? (
                            <Image src={coverUrl} alt={o.titre} width={40} height={56} className="w-10 h-14 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-14 rounded-lg bg-gradient-to-br from-indigo-600/30 to-purple-600/30 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{o.titre}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {o.type && <span className={`text-[10px] px-1.5 py-0.5 rounded ${(TYPE_COLORS[o.type] || {}).light || "bg-gray-500/15"} ${(TYPE_COLORS[o.type] || {}).text || "text-gray-400"}`}>{o.type}</span>}
                              <span className="text-xs text-gray-600">{updDate}</span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 font-mono flex-shrink-0">
                            {loadingChapters ? "..." : `${chapterCounts[o.documentId] || 0} ch.`}
                          </span>
                        </div>
                      );
                    })}
                    {oeuvreStats.recentlyUpdated.length === 0 && <p className="text-sm text-gray-600 italic text-center py-4">Aucune œuvre</p>}
                  </div>
                </div>
              </div>

              {/* Tableau récapitulatif des œuvres */}
              <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                <SectionTitle icon="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" title="Catalogue des œuvres" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800/50">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Œuvre</th>
                        <th className="text-center py-3 px-3 text-gray-400 font-medium">Type</th>
                        <th className="text-center py-3 px-3 text-gray-400 font-medium">État</th>
                        <th className="text-center py-3 px-3 text-gray-400 font-medium">Chapitres</th>
                        <th className="text-center py-3 px-3 text-gray-400 font-medium">Contributeurs</th>
                        <th className="text-center py-3 px-3 text-gray-400 font-medium">Ajoutée le</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oeuvres.map((o) => {
                        const coverUrl = Array.isArray(o.couverture) ? o.couverture?.[0]?.url : o.couverture?.url;
                        const typeC = TYPE_COLORS[o.type] || { text: "text-gray-400", light: "bg-gray-500/15" };
                        const etatC = ETAT_COLORS[o.etat] || { text: "text-gray-400", light: "bg-gray-500/15" };
                        return (
                          <tr key={o.documentId} className="border-b border-gray-800/20 hover:bg-white/[0.02]">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {coverUrl ? (
                                  <Image src={coverUrl} alt={o.titre} width={32} height={44} className="w-8 h-11 rounded-md object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-8 h-11 rounded-md bg-gray-700/30 flex items-center justify-center flex-shrink-0">
                                    <span className="text-[10px] text-gray-600">N/A</span>
                                  </div>
                                )}
                                <span className="text-gray-300 truncate max-w-[200px]">{o.titre}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-3">
                              <span className={`text-xs px-2 py-1 rounded-md ${typeC.light} ${typeC.text}`}>{o.type || "—"}</span>
                            </td>
                            <td className="text-center py-3 px-3">
                              <span className={`text-xs px-2 py-1 rounded-md ${etatC.light} ${etatC.text}`}>{o.etat || "—"}</span>
                            </td>
                            <td className="text-center py-3 px-3 text-gray-400 font-mono">
                              {loadingChapters ? "..." : chapterCounts[o.documentId] || 0}
                            </td>
                            <td className="text-center py-3 px-3">
                              <div className="flex items-center justify-center gap-1">
                                {(o.users || []).slice(0, 3).map((u, i) => (
                                  <span key={u.id || i} className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] text-white font-bold" title={u.username}>
                                    {u.username?.[0]?.toUpperCase() || "?"}
                                  </span>
                                ))}
                                {(o.users || []).length > 3 && (
                                  <span className="text-[10px] text-gray-400 ml-1">+{o.users.length - 3}</span>
                                )}
                                {(!o.users || o.users.length === 0) && <span className="text-gray-700 text-xs">—</span>}
                              </div>
                            </td>
                            <td className="text-center py-3 px-3 text-gray-400 text-xs">
                              {o.createdAt ? new Date(o.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════ SECTION VISIBILITÉ ═══════════════════ */}
      {section === "visibilite" && (
        <div className="space-y-6">
          {/* Période + titre */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Visibilité des œuvres
            </h3>
            <div className="flex bg-gray-800/40 rounded-xl p-1 border border-gray-700/30">
              {[
                { key: "total", label: "Total" },
                { key: "semaine", label: "Semaine" },
                { key: "mois", label: "Mois" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    period === p.key
                      ? "bg-pink-600 text-white shadow-lg shadow-pink-900/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {loadingTracking ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-3xl font-bold text-white">{trackingStats.totals.vues[period]}</span>
                      <p className="text-xs text-gray-400">Vues {period !== "total" ? `(${period})` : ""}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-3xl font-bold text-white">{trackingStats.totals.likes[period]}</span>
                      <p className="text-xs text-gray-400">Likes {period !== "total" ? `(${period})` : ""}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-3xl font-bold text-white">{trackingStats.totals.abonnes[period]}</span>
                      <p className="text-xs text-gray-400">Abonnés {period !== "total" ? `(${period})` : ""}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top œuvres par vues (barres) */}
              {trackingStats.perOeuvre.length > 0 && (
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <SectionTitle icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" title={`Top œuvres par vues (${period === "total" ? "total" : period})`} />
                  <div className="space-y-3">
                    {[...trackingStats.perOeuvre]
                      .sort((a, b) => b.vues[period] - a.vues[period])
                      .slice(0, 10)
                      .map((o) => {
                        const maxV = Math.max(...trackingStats.perOeuvre.map((x) => x.vues[period]), 1);
                        const barPct = (o.vues[period] / maxV) * 100;
                        const coverUrl = Array.isArray(o.couverture) ? o.couverture?.[0]?.url : o.couverture?.url;
                        return (
                          <div key={o.documentId}>
                            <div className="flex items-center gap-3 mb-1">
                              {coverUrl ? (
                                <Image src={coverUrl} alt={o.titre || "Couverture"} width={24} height={32} className="w-6 h-8 rounded object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-6 h-8 rounded bg-gray-700/30 flex-shrink-0" />
                              )}
                              <span className="text-sm text-gray-300 truncate flex-1">{o.titre}</span>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-xs text-pink-400 font-mono">{o.vues[period]} <span className="text-gray-600">vues</span></span>
                                <span className="text-xs text-red-400 font-mono">{o.likes[period]} <span className="text-gray-600">likes</span></span>
                                <span className="text-xs text-indigo-400 font-mono">{o.abonnes[period]} <span className="text-gray-600">abo</span></span>
                              </div>
                            </div>
                            <div className="h-2 bg-gray-800/60 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all duration-700" style={{ width: `${barPct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Liste des œuvres (expandable pour chapitres) */}
              <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                <SectionTitle icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" title="Détail par œuvre et par chapitre" />
                {oeuvres.length === 0 ? (
                  <p className="text-sm text-gray-600 italic text-center py-8">Aucune œuvre dans la team</p>
                ) : (
                  <div className="space-y-2">
                    {trackingStats.perOeuvre.map((o) => {
                      const isExpanded = expandedOeuvre === o.documentId;
                      const coverUrl = Array.isArray(o.couverture) ? o.couverture?.[0]?.url : o.couverture?.url;
                      const chapters = oeuvreChapters[o.documentId] || [];
                      const isLoadingChaps = loadingOeuvreChapters === o.documentId;
                      const chapViewMap = trackingStats.chapterViews(o.documentId);

                      return (
                        <div key={o.documentId} className="border border-gray-800/40 rounded-xl overflow-hidden">
                          {/* Ligne œuvre */}
                          <button
                            onClick={() => setExpandedOeuvre(isExpanded ? null : o.documentId)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors text-left"
                          >
                            {/* Chevron */}
                            <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                            {/* Cover */}
                            {coverUrl ? (
                              <Image src={coverUrl} alt={o.titre || "Couverture"} width={40} height={56} className="w-10 h-14 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-14 rounded-lg bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              </div>
                            )}
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{o.titre}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {o.type && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${(TYPE_COLORS[o.type] || {}).light || "bg-gray-500/15"} ${(TYPE_COLORS[o.type] || {}).text || "text-gray-400"}`}>{o.type}</span>
                                )}
                                {o.etat && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${(ETAT_COLORS[o.etat] || {}).light || "bg-gray-500/15"} ${(ETAT_COLORS[o.etat] || {}).text || "text-gray-400"}`}>{o.etat}</span>
                                )}
                              </div>
                            </div>
                            {/* Metrics */}
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <div className="text-center">
                                <p className="text-lg font-bold text-pink-400">{o.vues[period]}</p>
                                <p className="text-[10px] text-gray-600 uppercase">Vues</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-red-400">{o.likes[period]}</p>
                                <p className="text-[10px] text-gray-600 uppercase">Likes</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-indigo-400">{o.abonnes[period]}</p>
                                <p className="text-[10px] text-gray-600 uppercase">Abonnés</p>
                              </div>
                            </div>
                          </button>

                          {/* Section chapitres (expanded) */}
                          {isExpanded && (
                            <div className="border-t border-gray-800/40 bg-gray-950/30">
                              {isLoadingChaps ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                              ) : chapters.length === 0 ? (
                                <p className="text-sm text-gray-600 italic text-center py-6">Aucun chapitre</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-800/40">
                                        <th className="text-left py-2.5 px-4 text-gray-400 font-medium text-xs">Ch.</th>
                                        <th className="text-left py-2.5 px-4 text-gray-400 font-medium text-xs">Titre</th>
                                        <th className="text-center py-2.5 px-4 text-gray-400 font-medium text-xs">
                                          Vues {period !== "total" && <span className="text-gray-700">({period})</span>}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {chapters.map((ch) => {
                                        const chEvents = chapViewMap[ch.documentId] || [];
                                        const now = new Date();
                                        const weekAgo = new Date(now.getTime() - 7 * 86400000);
                                        const monthAgo = new Date(now.getTime() - 30 * 86400000);
                                        let viewCount = chEvents.length;
                                        if (period === "semaine") viewCount = chEvents.filter((e) => new Date(e.createdAt) >= weekAgo).length;
                                        if (period === "mois") viewCount = chEvents.filter((e) => new Date(e.createdAt) >= monthAgo).length;
                                        const maxViews = Math.max(
                                          ...chapters.map((c2) => {
                                            const ev = chapViewMap[c2.documentId] || [];
                                            if (period === "semaine") return ev.filter((e) => new Date(e.createdAt) >= weekAgo).length;
                                            if (period === "mois") return ev.filter((e) => new Date(e.createdAt) >= monthAgo).length;
                                            return ev.length;
                                          }),
                                          1
                                        );
                                        const barPct = (viewCount / maxViews) * 100;

                                        return (
                                          <tr key={ch.documentId} className="border-b border-gray-800/20 hover:bg-white/[0.02]">
                                            <td className="py-2.5 px-4 text-gray-400 font-mono text-xs">{ch.order}</td>
                                            <td className="py-2.5 px-4 text-gray-300 text-xs truncate max-w-[200px]">{ch.titre || `Chapitre ${ch.order}`}</td>
                                            <td className="py-2.5 px-4">
                                              <div className="flex items-center gap-2 justify-center">
                                                <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                  <div className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all" style={{ width: `${barPct}%` }} />
                                                </div>
                                                <span className="text-xs text-pink-400 font-mono w-8 text-right">{viewCount}</span>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}

// --- Composants utilitaires ---
function KPICard({ label, value, icon, color, bg, suffix }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 flex flex-col gap-2">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
        <svg className={`w-[18px] h-[18px] ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
        </svg>
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-white">{value}</span>
          {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
        </div>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <h3 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
      </svg>
      {title}
    </h3>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-600">
      <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={icon} />
      </svg>
      <p className="text-lg font-medium text-gray-400 mb-1">{title}</p>
      <p className="text-sm text-gray-600">{subtitle}</p>
    </div>
  );
}
