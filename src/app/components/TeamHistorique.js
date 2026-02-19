"use client";

import { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";

export default function TeamHistorique({ team }) {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchActivities = useCallback(async () => {
    const jwt = Cookies.get("jwt");
    if (!jwt || !team?.documentId) return;

    setIsLoading(true);
    try {
      const events = [];

      // 1. Récupérer les invitations (acceptées = membre rejoint, pending = invité)
      const invRes = await fetch(
        `/api/proxy/team-invitations?filters[team][documentId][$eq]=${team.documentId}&populate=user&sort=createdAt:desc&pagination[pageSize]=100`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const invData = await invRes.json();
      (invData.data || []).forEach((inv) => {
        if (inv.status === "accepted") {
          events.push({
            id: `inv-accept-${inv.id}`,
            type: "member_joined",
            icon: "👋",
            color: "text-green-400",
            bgColor: "bg-green-500/20",
            label: `${inv.user?.username || "Quelqu'un"} a rejoint la team`,
            detail: `Rôle: ${inv.role === "editor" || inv.role === "editeur" ? "Éditeur" : inv.role === "admin" ? "Admin" : "Membre"}`,
            date: inv.updatedAt || inv.createdAt,
          });
        } else if (inv.status === "pending") {
          events.push({
            id: `inv-pending-${inv.id}`,
            type: "invite_sent",
            icon: "📩",
            color: "text-amber-400",
            bgColor: "bg-amber-500/20",
            label: `Invitation envoyée à ${inv.user?.username || "un utilisateur"}`,
            detail: `Rôle proposé: ${inv.role === "editor" || inv.role === "editeur" ? "Éditeur" : inv.role === "admin" ? "Admin" : "Membre"}`,
            date: inv.createdAt,
          });
        }
      });

      // 2. Récupérer les tâches kanban récentes
      const taskRes = await fetch(
        `/api/proxy/team-tasks?filters[team][documentId][$eq]=${team.documentId}&populate=assignee&sort=updatedAt:desc&pagination[pageSize]=50`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const taskData = await taskRes.json();
      (taskData.data || []).forEach((task) => {
        const statusLabels = {
          todo: "À faire",
          in_progress: "En cours",
          review: "En relecture",
          done: "Terminée",
        };
        events.push({
          id: `task-${task.id}`,
          type: "task_update",
          icon: task.status === "done" ? "✅" : "📝",
          color: task.status === "done" ? "text-green-400" : "text-blue-400",
          bgColor: task.status === "done" ? "bg-green-500/20" : "bg-blue-500/20",
          label: `Tâche "${task.title || "Sans titre"}" — ${statusLabels[task.status] || task.status}`,
          detail: task.assignee?.username ? `Assignée à ${task.assignee.username}` : null,
          date: task.updatedAt,
        });
      });

      // 3. Récupérer les annonces de la team
      const annRes = await fetch(
        `/api/proxy/team-annonces?filters[team][documentId][$eq]=${team.documentId}&populate=auteur&sort=createdAt:desc&pagination[pageSize]=30`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const annData = await annRes.json();
      (annData.data || []).forEach((ann) => {
        events.push({
          id: `ann-${ann.id}`,
          type: "announcement",
          icon: "📢",
          color: "text-purple-400",
          bgColor: "bg-purple-500/20",
          label: `Annonce publiée par ${ann.auteur?.username || "Anonyme"}`,
          detail: ann.message?.substring(0, 80) + (ann.message?.length > 80 ? "..." : ""),
          date: ann.createdAt,
        });
      });

      // Trier par date DESC
      events.sort((a, b) => new Date(b.date) - new Date(a.date));
      setActivities(events);
    } catch (err) {
      console.error("Erreur historique:", err);
    } finally {
      setIsLoading(false);
    }
  }, [team?.documentId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH < 24) return `Il y a ${diffH}h`;
    if (diffD < 7) return `Il y a ${diffD}j`;
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filterTypes = [
    { key: "all", label: "Tout" },
    { key: "member_joined", label: "Membres" },
    { key: "task_update", label: "Tâches" },
    { key: "announcement", label: "Annonces" },
    { key: "invite_sent", label: "Invitations" },
  ];

  const filteredActivities = filter === "all"
    ? activities
    : activities.filter((a) => a.type === filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Chargement de l&apos;historique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {filterTypes.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-indigo-600 text-white"
                : "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-400">Aucune activité récente</p>
        </div>
      ) : (
        <div className="relative">
          {/* Ligne verticale */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-800" />

          <div className="space-y-1">
            {filteredActivities.map((activity, index) => {
              // Détecteur de séparateur de jour
              const actDate = new Date(activity.date).toDateString();
              const prevDate = index > 0 ? new Date(filteredActivities[index - 1].date).toDateString() : null;
              const showDateSeparator = index === 0 || actDate !== prevDate;

              return (
                <div key={activity.id}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 py-3 pl-12">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {new Date(activity.date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                      <div className="flex-1 h-px bg-gray-800" />
                    </div>
                  )}

                  <div className="flex items-start gap-4 py-2.5 pl-1 group">
                    {/* Icône timeline */}
                    <div className={`relative z-10 w-9 h-9 rounded-lg ${activity.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-sm">{activity.icon}</span>
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0 bg-gray-800/20 group-hover:bg-gray-800/40 rounded-xl px-4 py-3 transition-colors">
                      <p className="text-sm text-gray-200">{activity.label}</p>
                      {activity.detail && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{activity.detail}</p>
                      )}
                    </div>

                    {/* Date */}
                    <span className="text-xs text-gray-600 whitespace-nowrap pt-3 flex-shrink-0">
                      {formatDate(activity.date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
