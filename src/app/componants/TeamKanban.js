"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Configuration
const COLUMNS = [
  { id: "todo", title: "À faire", icon: "\u25CB", color: "text-gray-400", bg: "bg-gray-500/8", headerBg: "bg-gray-500/10", border: "border-gray-600/20", dot: "bg-gray-400", ring: "ring-gray-500/30" },
  { id: "in-progress", title: "En cours", icon: "\u25D0", color: "text-blue-400", bg: "bg-blue-500/8", headerBg: "bg-blue-500/10", border: "border-blue-500/20", dot: "bg-blue-400", ring: "ring-blue-500/30" },
  { id: "review", title: "Relecture", icon: "\u25C9", color: "text-amber-400", bg: "bg-amber-500/8", headerBg: "bg-amber-500/10", border: "border-amber-500/20", dot: "bg-amber-400", ring: "ring-amber-500/30" },
  { id: "done", title: "Terminé", icon: "\u25CF", color: "text-emerald-400", bg: "bg-emerald-500/8", headerBg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400", ring: "ring-emerald-500/30" },
];

const PRIORITIES = {
  low:    { label: "Basse",   icon: "\u2193", bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/20" },
  medium: { label: "Moyenne", icon: "\u2192", bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/20" },
  high:   { label: "Haute",   icon: "\u2191", bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/20" },
  urgent: { label: "Urgente", icon: "\u26A1", bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/20" },
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// Composant Principal
export default function TeamKanban({ team, user, isOwner, isAdmin, isEditor }) {
  const [tasks, setTasks] = useState([]);
  const [openTask, setOpenTask] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addToColumn, setAddToColumn] = useState("todo");
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const canEdit = isOwner || isAdmin || isEditor;

  const storageKey = `kanban-v2-${team.documentId}`;

  // Persistence
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const migrated = parsed.map((t) => ({
          checklist: [],
          links: [],
          comments: [],
          dueDate: null,
          ...t,
        }));
        setTasks(migrated);
      }
    } catch (e) {
      console.error("Kanban load error:", e);
    }
  }, [storageKey]);

  const save = useCallback(
    (updated) => {
      setTasks(updated);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error("Kanban save error:", e);
      }
    },
    [storageKey]
  );

  // CRUD helpers
  const addTask = (data) => {
    const t = {
      id: uid(),
      ...data,
      checklist: data.checklist || [],
      links: data.links || [],
      comments: [],
      createdBy: user?.username || "Inconnu",
      createdAt: new Date().toISOString(),
    };
    save([...tasks, t]);
    setShowAddModal(false);
  };

  const updateTask = (data) => {
    const updated = tasks.map((t) => (t.id === data.id ? { ...t, ...data } : t));
    save(updated);
    if (openTask?.id === data.id) setOpenTask({ ...openTask, ...data });
  };

  const deleteTask = (id) => {
    save(tasks.filter((t) => t.id !== id));
    if (openTask?.id === id) setOpenTask(null);
  };

  const moveTask = (id, col) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, column: col } : t));
    save(updated);
    if (openTask?.id === id) setOpenTask({ ...openTask, column: col });
  };

  // Drag and Drop
  const onDragStart = (e, task) => { setDraggedTask(task); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e, colId) => { e.preventDefault(); setDragOverCol(colId); };
  const onDragLeave = () => setDragOverCol(null);
  const onDrop = (e, colId) => {
    e.preventDefault();
    setDragOverCol(null);
    if (draggedTask && draggedTask.column !== colId) moveTask(draggedTask.id, colId);
    setDraggedTask(null);
  };
  const onDragEnd = () => { setDraggedTask(null); setDragOverCol(null); };

  // Filtrage
  const allAssignees = [...new Set(tasks.map((t) => t.assignee).filter(Boolean))];

  const filtered = tasks.filter((t) => {
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterAssignee && t.assignee !== filterAssignee) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Stats
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.column === "done").length;
  const progressPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="relative">
      {/* Header + Stats */}
      <div className="mb-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 rounded-xl border border-purple-500/10">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Espace de travail</h2>
              <p className="text-sm text-gray-400">{totalTasks} tâche{totalTasks !== 1 ? "s" : ""} · {progressPct}% complété</p>
            </div>
          </div>

          {totalTasks > 0 && (
            <div className="flex items-center gap-3 min-w-[220px]">
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-sm text-gray-400 font-mono">{doneTasks}/{totalTasks}</span>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une tâche..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/40 border border-gray-700/30 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-600/40 transition-colors"
            />
          </div>

          <select
            value={filterPriority || ""}
            onChange={(e) => setFilterPriority(e.target.value || null)}
            className="px-4 py-2.5 bg-gray-800/40 border border-gray-700/30 rounded-xl text-sm text-gray-300 outline-none focus:border-indigo-600/40"
          >
            <option value="">Toutes priorités</option>
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>

          {allAssignees.length > 0 && (
            <select
              value={filterAssignee || ""}
              onChange={(e) => setFilterAssignee(e.target.value || null)}
              className="px-4 py-2.5 bg-gray-800/40 border border-gray-700/30 rounded-xl text-sm text-gray-300 outline-none focus:border-indigo-600/40"
            >
              <option value="">Tous les membres</option>
              {allAssignees.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          )}

          {(filterPriority || filterAssignee || searchQuery) && (
            <button
              onClick={() => { setFilterPriority(null); setFilterAssignee(null); setSearchQuery(""); }}
              className="px-4 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800/40 border border-gray-700/30 rounded-xl transition-colors"
            >
              × Réinitialiser
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => { setAddToColumn("todo"); setShowAddModal(true); }}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle tâche
            </button>
          )}
        </div>
      </div>

      {/* Colonnes Kanban */}
      <div className="flex gap-5 overflow-x-auto pb-4 -mx-2 px-2" style={{ minHeight: "calc(100vh - 320px)" }}>
        {COLUMNS.map((col) => {
          const colTasks = filtered.filter((t) => t.column === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              className={`rounded-xl border transition-all duration-200 min-w-[300px] flex-1 flex flex-col ${col.border} ${isOver ? `ring-2 ${col.ring} ${col.bg}` : "bg-gray-900/40"}`}
              onDragOver={(e) => onDragOver(e, col.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, col.id)}
            >
              <div className={`flex items-center justify-between px-4 py-3 border-b ${col.border} ${col.headerBg} rounded-t-xl`}>
                <div className="flex items-center gap-2.5">
                  <span className={`text-base ${col.color}`}>{col.icon}</span>
                  <span className={`text-sm font-semibold ${col.color}`}>{col.title}</span>
                  <span className="ml-1 text-xs text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded-full font-mono">{colTasks.length}</span>
                </div>
                {canEdit && (
                  <button
                    onClick={() => { setAddToColumn(col.id); setShowAddModal(true); }}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="p-3 space-y-2.5 flex-1 min-h-[200px]">
                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-700">
                    <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm">Glissez ici</span>
                  </div>
                )}
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    canEdit={canEdit}
                    isDragged={draggedTask?.id === task.id}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onOpen={() => setOpenTask(task)}
                    onMove={moveTask}
                    onDelete={() => { if (window.confirm("Supprimer cette t\u00E2che ?")) deleteTask(task.id); }}
                    columns={COLUMNS}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panneau de detail */}
      {openTask && (
        <TaskDetail
          task={tasks.find((t) => t.id === openTask.id) || openTask}
          canEdit={canEdit}
          user={user}
          columns={COLUMNS}
          onUpdate={updateTask}
          onDelete={() => { if (window.confirm("Supprimer cette t\u00E2che ?")) deleteTask(openTask.id); }}
          onClose={() => setOpenTask(null)}
        />
      )}

      {/* Modal creation rapide */}
      {showAddModal && (
        <QuickAddModal
          column={addToColumn}
          columns={COLUMNS}
          user={user}
          onSave={addTask}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// Carte de tache (kanban)
function TaskCard({ task, canEdit, isDragged, onDragStart, onDragEnd, onOpen, onMove, onDelete, columns }) {
  const [showCtx, setShowCtx] = useState(false);
  const ctxRef = useRef(null);
  const pri = PRIORITIES[task.priority] || PRIORITIES.medium;

  useEffect(() => {
    const fn = (e) => { if (ctxRef.current && !ctxRef.current.contains(e.target)) setShowCtx(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const checkDone = (task.checklist || []).filter((c) => c.done).length;
  const checkTotal = (task.checklist || []).length;
  const commentCount = (task.comments || []).length;
  const linkCount = (task.links || []).length;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.column !== "done";

  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`group relative bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700/30 hover:border-gray-600/40 rounded-xl p-4 transition-all duration-150 select-none ${
        canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${isDragged ? "opacity-30 scale-95 rotate-1" : ""}`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-lg border ${pri.bg} ${pri.text} ${pri.border} font-medium`}>
            {pri.icon} {pri.label}
          </span>
          {isOverdue && (
            <span className="text-xs px-2 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 font-medium">
              En retard
            </span>
          )}
        </div>

        {canEdit && (
          <div className="relative" ref={ctxRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowCtx(!showCtx); }}
              className="p-1 rounded-lg text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showCtx && (
              <div className="absolute right-0 top-6 w-44 bg-gray-900 border border-gray-700/60 rounded-xl shadow-2xl z-40 overflow-hidden py-1">
                {columns
                  .filter((c) => c.id !== task.column)
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={(e) => { e.stopPropagation(); setShowCtx(false); onMove(task.id, c.id); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/5 text-gray-300 transition-colors"
                    >
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      Vers « {c.title} »
                    </button>
                  ))}
                <div className="border-t border-gray-700/40 my-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCtx(false); onDelete(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-red-500/10 text-red-400 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <p className={`text-[15px] font-semibold leading-snug mb-2 ${task.column === "done" ? "text-gray-400 line-through" : "text-white"}`}>
        {task.title}
      </p>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-400 line-clamp-2 mb-2.5 leading-relaxed">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {task.tags.map((tag, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/15">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Indicators row */}
      <div className="flex items-center gap-3 text-xs text-gray-600 pt-2 border-t border-gray-700/20">
        {checkTotal > 0 && (
          <span className={`flex items-center gap-1 ${checkDone === checkTotal ? "text-emerald-500" : ""}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            {checkDone}/{checkTotal}
          </span>
        )}
        {commentCount > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            {commentCount}
          </span>
        )}
        {linkCount > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {linkCount}
          </span>
        )}
        {task.dueDate && (
          <span className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : ""}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-gray-400">
          {task.assignee && (
            <>
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] text-white font-bold">
                {task.assignee[0]?.toUpperCase()}
              </span>
              <span className="max-w-[80px] truncate">{task.assignee}</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

// Panneau de detail (slide-over)
function TaskDetail({ task, canEdit, user, columns, onUpdate, onDelete, onClose }) {
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || "");
  const [editDesc, setEditDesc] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newComment, setNewComment] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const panelRef = useRef(null);
  const pri = PRIORITIES[task.priority] || PRIORITIES.medium;
  const col = columns.find((c) => c.id === task.column) || columns[0];

  useEffect(() => {
    setTitle(task.title);
    setDesc(task.description || "");
  }, [task.title, task.description]);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const saveTitle = () => {
    if (title.trim() && title.trim() !== task.title) onUpdate({ id: task.id, title: title.trim() });
    setEditTitle(false);
  };
  const saveDesc = () => {
    onUpdate({ id: task.id, description: desc.trim() });
    setEditDesc(false);
  };

  // Checklist
  const checklist = task.checklist || [];
  const checkDone = checklist.filter((c) => c.done).length;
  const checkPct = checklist.length ? Math.round((checkDone / checklist.length) * 100) : 0;

  const toggleCheck = (idx) => {
    const updated = checklist.map((c, i) => (i === idx ? { ...c, done: !c.done } : c));
    onUpdate({ id: task.id, checklist: updated });
  };
  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    onUpdate({ id: task.id, checklist: [...checklist, { id: uid(), text: newCheckItem.trim(), done: false }] });
    setNewCheckItem("");
  };
  const removeCheckItem = (idx) => {
    onUpdate({ id: task.id, checklist: checklist.filter((_, i) => i !== idx) });
  };

  // Links
  const links = task.links || [];
  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    let url = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    onUpdate({ id: task.id, links: [...links, { id: uid(), url, label: newLinkLabel.trim() || url }] });
    setNewLinkUrl("");
    setNewLinkLabel("");
    setShowLinkForm(false);
  };
  const removeLink = (idx) => {
    onUpdate({ id: task.id, links: links.filter((_, i) => i !== idx) });
  };

  // Comments
  const comments = task.comments || [];
  const addComment = () => {
    if (!newComment.trim()) return;
    const c = { id: uid(), text: newComment.trim(), author: user?.username || "Inconnu", date: new Date().toISOString() };
    onUpdate({ id: task.id, comments: [...comments, c] });
    setNewComment("");
  };
  const removeComment = (idx) => {
    onUpdate({ id: task.id, comments: comments.filter((_, i) => i !== idx) });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 w-full max-w-xl bg-gray-950 border-l border-gray-800/60 z-50 overflow-y-auto shadow-2xl"
        style={{ animation: "slideIn .2s ease-out" }}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-gray-950/90 backdrop-blur-md border-b border-gray-800/40">
          <div className="flex items-center gap-2 text-sm">
            <span className={`${col.color} font-medium flex items-center gap-1.5`}>
              <span className={`w-2 h-2 rounded-full ${col.dot}`} /> {col.title}
            </span>
            <span className="text-gray-700">·</span>
            <span className={`${pri.text} text-xs px-1.5 py-0.5 rounded ${pri.bg} border ${pri.border}`}>{pri.icon} {pri.label}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors" aria-label="Fermer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">

          {/* Titre */}
          {editTitle && canEdit ? (
            <div className="flex gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                className="flex-1 text-xl font-bold bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500/50"
                autoFocus
              />
              <button onClick={saveTitle} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500">OK</button>
              <button onClick={() => { setTitle(task.title); setEditTitle(false); }} className="px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700">×</button>
            </div>
          ) : (
            <h2
              className={`text-xl font-bold ${task.column === "done" ? "text-gray-400 line-through" : "text-white"} ${canEdit ? "cursor-pointer hover:text-indigo-300 transition-colors" : ""}`}
              onClick={() => canEdit && setEditTitle(true)}
            >
              {task.title}
            </h2>
          )}

          {/* Metadonnees */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-800/40">
              <span className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">Statut</span>
              {canEdit ? (
                <select
                  value={task.column}
                  onChange={(e) => onUpdate({ id: task.id, column: e.target.value })}
                  className="block mt-1 w-full bg-transparent text-sm text-white outline-none cursor-pointer"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id} className="bg-gray-900">{c.icon} {c.title}</option>
                  ))}
                </select>
              ) : (
                <p className={`mt-1 text-sm ${col.color} font-medium`}>{col.icon} {col.title}</p>
              )}
            </div>
            <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-800/40">
              <span className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">Priorité</span>
              {canEdit ? (
                <select
                  value={task.priority}
                  onChange={(e) => onUpdate({ id: task.id, priority: e.target.value })}
                  className="block mt-1 w-full bg-transparent text-sm text-white outline-none cursor-pointer"
                >
                  {Object.entries(PRIORITIES).map(([k, v]) => (
                    <option key={k} value={k} className="bg-gray-900">{v.icon} {v.label}</option>
                  ))}
                </select>
              ) : (
                <p className={`mt-1 text-sm ${pri.text} font-medium`}>{pri.icon} {pri.label}</p>
              )}
            </div>
            <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-800/40">
              <span className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">Assigné à</span>
              {canEdit ? (
                <input
                  value={task.assignee || ""}
                  onChange={(e) => onUpdate({ id: task.id, assignee: e.target.value })}
                  placeholder="Non assigné"
                  className="block mt-1 w-full bg-transparent text-sm text-white outline-none placeholder-gray-600"
                />
              ) : (
                <p className="mt-1 text-sm text-white">{task.assignee || "\u2014"}</p>
              )}
            </div>
            <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-800/40">
              <span className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">Échéance</span>
              {canEdit ? (
                <input
                  type="date"
                  value={task.dueDate || ""}
                  onChange={(e) => onUpdate({ id: task.id, dueDate: e.target.value || null })}
                  className="block mt-1 w-full bg-transparent text-sm text-white outline-none cursor-pointer [color-scheme:dark]"
                />
              ) : (
                <p className="mt-1 text-sm text-white">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString("fr-FR") : "\u2014"}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          {canEdit ? (
            <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-800/40">
              <span className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">Tags</span>
              <input
                value={(task.tags || []).join(", ")}
                onChange={(e) => onUpdate({ id: task.id, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                placeholder="traduction, relecture, correction..."
                className="block mt-1 w-full bg-transparent text-sm text-white outline-none placeholder-gray-600"
              />
            </div>
          ) : task.tags?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map((t, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/15">{t}</span>
              ))}
            </div>
          ) : null}

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Description
              </h3>
              {canEdit && !editDesc && (
                <button onClick={() => setEditDesc(true)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Modifier
                </button>
              )}
            </div>
            {editDesc && canEdit ? (
              <div>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={4}
                  placeholder="Décrivez la tâche en détail..."
                  className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700/40 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/40 resize-none"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveDesc} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-500">Enregistrer</button>
                  <button onClick={() => { setDesc(task.description || ""); setEditDesc(false); }} className="px-3 py-1.5 bg-gray-800 text-gray-400 text-xs rounded-lg hover:bg-gray-700">Annuler</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => canEdit && setEditDesc(true)}
                className={`text-sm leading-relaxed whitespace-pre-wrap ${task.description ? "text-gray-400" : "text-gray-700 italic"} ${canEdit ? "cursor-pointer hover:text-gray-300" : ""} min-h-[32px]`}
              >
                {task.description || "Aucune description"}
              </div>
            )}
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Checklist
                {checklist.length > 0 && (
                  <span className="text-[11px] text-gray-600 font-normal">({checkDone}/{checklist.length})</span>
                )}
              </h3>
            </div>

            {checklist.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${checkPct === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                    style={{ width: `${checkPct}%` }}
                  />
                </div>
                <span className="text-[11px] text-gray-400 font-mono">{checkPct}%</span>
              </div>
            )}

            <div className="space-y-1">
              {checklist.map((item, idx) => (
                <div key={item.id || idx} className="group/check flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <button
                    onClick={() => canEdit && toggleCheck(idx)}
                    className={`flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                      item.done
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-gray-600 hover:border-indigo-500"
                    } ${canEdit ? "cursor-pointer" : ""}`}
                    style={{ width: 18, height: 18 }}
                  >
                    {item.done && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${item.done ? "line-through text-gray-600" : "text-gray-300"}`}>
                    {item.text}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => removeCheckItem(idx)}
                      className="opacity-0 group-hover/check:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {canEdit && (
              <div className="flex gap-2 mt-2">
                <input
                  value={newCheckItem}
                  onChange={(e) => setNewCheckItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCheckItem()}
                  placeholder="Ajouter un élément..."
                  className="flex-1 px-3 py-2 bg-gray-800/30 border border-gray-700/30 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/40"
                />
                <button
                  onClick={addCheckItem}
                  disabled={!newCheckItem.trim()}
                  className="px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-30"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Liens / URLs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Liens
                {links.length > 0 && <span className="text-[11px] text-gray-600 font-normal">({links.length})</span>}
              </h3>
              {canEdit && !showLinkForm && (
                <button onClick={() => setShowLinkForm(true)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  + Ajouter
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {links.map((link, idx) => (
                <div key={link.id || idx} className="group/link flex items-center gap-2.5 py-2 px-3 bg-gray-800/25 rounded-lg border border-gray-800/30 hover:border-gray-700/40 transition-colors">
                  <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-indigo-400 hover:text-indigo-300 truncate transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {link.label}
                  </a>
                  {canEdit && (
                    <button
                      onClick={() => removeLink(idx)}
                      className="opacity-0 group-hover/link:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {links.length === 0 && !showLinkForm && (
                <p className="text-xs text-gray-700 italic py-1">Aucun lien</p>
              )}
            </div>

            {canEdit && showLinkForm && (
              <div className="mt-2 p-3 bg-gray-800/30 rounded-xl border border-gray-700/30 space-y-2">
                <input
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/30 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/40"
                  autoFocus
                />
                <input
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLink()}
                  placeholder="Libellé (optionnel)"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/30 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/40"
                />
                <div className="flex gap-2">
                  <button onClick={addLink} disabled={!newLinkUrl.trim()} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-500 disabled:opacity-30">
                    Ajouter
                  </button>
                  <button onClick={() => { setShowLinkForm(false); setNewLinkUrl(""); setNewLinkLabel(""); }} className="px-3 py-1.5 bg-gray-800 text-gray-400 text-xs rounded-lg hover:bg-gray-700">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Commentaires */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Commentaires
              {comments.length > 0 && <span className="text-[11px] text-gray-600 font-normal">({comments.length})</span>}
            </h3>

            <div className="flex gap-2 mb-4">
              <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs text-white font-bold">
                {(user?.username || "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                  placeholder="Écrire un commentaire... (Entrée pour envoyer)"
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800/30 border border-gray-700/30 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/40 resize-none"
                />
                {newComment.trim() && (
                  <button onClick={addComment} className="mt-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-500 transition-colors">
                    Publier
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {comments.slice().reverse().map((c, idx) => (
                <div key={c.id || idx} className="group/comment flex gap-2.5">
                  <div className="w-7 h-7 flex-shrink-0 rounded-full bg-gray-700/50 flex items-center justify-center text-[10px] text-gray-400 font-bold mt-0.5">
                    {c.author?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-gray-300">{c.author}</span>
                      <span className="text-[10px] text-gray-600">{timeAgo(c.date)}</span>
                      {canEdit && (
                        <button
                          onClick={() => removeComment(comments.length - 1 - idx)}
                          className="opacity-0 group-hover/comment:opacity-100 text-gray-600 hover:text-red-400 transition-all ml-auto"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 whitespace-pre-wrap mt-0.5 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-gray-700 italic text-center py-2">Aucun commentaire</p>
              )}
            </div>
          </div>

          {/* Footer info */}
          <div className="pt-4 border-t border-gray-800/40 flex items-center justify-between text-[11px] text-gray-600">
            <span>Créée par {task.createdBy} · {task.createdAt ? timeAgo(task.createdAt) : ""}</span>
            {canEdit && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1 px-3 py-1.5 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Supprimer la tâche
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

// Modal de creation rapide
function QuickAddModal({ column, columns, user, onSave, onClose }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    column: column,
    assignee: user?.username || "",
    tags: "",
    dueDate: "",
    checklist: [],
    links: [],
  });
  const [checkInput, setCheckInput] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");

  const addCheck = () => {
    if (!checkInput.trim()) return;
    setForm({ ...form, checklist: [...form.checklist, { id: uid(), text: checkInput.trim(), done: false }] });
    setCheckInput("");
  };
  const removeCheck = (idx) => {
    setForm({ ...form, checklist: form.checklist.filter((_, i) => i !== idx) });
  };
  const addLink = () => {
    if (!linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    setForm({ ...form, links: [...form.links, { id: uid(), url, label: linkLabel.trim() || url }] });
    setLinkUrl("");
    setLinkLabel("");
  };
  const removeLink = (idx) => {
    setForm({ ...form, links: form.links.filter((_, i) => i !== idx) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      column: form.column,
      assignee: form.assignee.trim(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      dueDate: form.dueDate || null,
      checklist: form.checklist,
      links: form.links,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-950 border border-gray-800/60 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/40">
          <h2 className="text-lg font-bold text-white">Nouvelle tâche</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors" aria-label="Fermer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Titre <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Ex: Traduire le chapitre 35"
              className="w-full px-4 py-2.5 bg-gray-800/40 border border-gray-700/30 focus:border-indigo-500/50 rounded-xl text-white placeholder-gray-600 outline-none transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Détails..."
              className="w-full px-4 py-2.5 bg-gray-800/40 border border-gray-700/30 focus:border-indigo-500/50 rounded-xl text-white placeholder-gray-600 outline-none transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Priorité</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-800/40 border border-gray-700/30 focus:border-indigo-500/50 rounded-xl text-white outline-none transition-colors text-sm"
              >
                {Object.entries(PRIORITIES).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Statut</label>
              <select
                value={form.column}
                onChange={(e) => setForm({ ...form, column: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-800/40 border border-gray-700/30 focus:border-indigo-500/50 rounded-xl text-white outline-none transition-colors text-sm"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Échéance</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-800/40 border border-gray-700/30 focus:border-indigo-500/50 rounded-xl text-white outline-none transition-colors text-sm [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Assigné à</label>
              <input
                type="text"
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                placeholder="Nom"
                className="w-full px-3 py-2.5 bg-gray-800/40 border border-gray-700/30 focus:border-indigo-500/50 rounded-xl text-white placeholder-gray-600 outline-none transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Tags</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="tag1, tag2"
                className="w-full px-3 py-2.5 bg-gray-800/40 border border-gray-700/30 focus:border-indigo-500/50 rounded-xl text-white placeholder-gray-600 outline-none transition-colors text-sm"
              />
            </div>
          </div>

          {/* Checklist inline */}
          <div className="bg-gray-800/20 rounded-xl border border-gray-800/30 p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Checklist
            </p>
            {form.checklist.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2 py-1 text-sm text-gray-300">
                <span className="w-4 h-4 rounded-md border-2 border-gray-600 flex-shrink-0" />
                <span className="flex-1">{item.text}</span>
                <button type="button" onClick={() => removeCheck(idx)} className="text-gray-600 hover:text-red-400 text-xs">×</button>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <input
                value={checkInput}
                onChange={(e) => setCheckInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCheck())}
                placeholder="Ajouter un élément..."
                className="flex-1 px-3 py-1.5 bg-gray-900/50 border border-gray-700/30 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/40"
              />
              <button type="button" onClick={addCheck} disabled={!checkInput.trim()} className="px-2.5 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-white text-sm rounded-lg disabled:opacity-30">+</button>
            </div>
          </div>

          {/* Liens inline */}
          <div className="bg-gray-800/20 rounded-xl border border-gray-800/30 p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Liens
            </p>
            {form.links.map((link, idx) => (
              <div key={link.id} className="flex items-center gap-2 py-1 text-sm">
                <span className="text-indigo-400 truncate flex-1">{link.label}</span>
                <button type="button" onClick={() => removeLink(idx)} className="text-gray-600 hover:text-red-400 text-xs">×</button>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="URL"
                className="flex-1 px-3 py-1.5 bg-gray-900/50 border border-gray-700/30 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/40"
              />
              <input
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
                placeholder="Libellé"
                className="w-24 px-3 py-1.5 bg-gray-900/50 border border-gray-700/30 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/40"
              />
              <button type="button" onClick={addLink} disabled={!linkUrl.trim()} className="px-2.5 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-white text-sm rounded-lg disabled:opacity-30">+</button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 rounded-xl text-sm font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-900/20"
            >
              Créer la tâche
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
