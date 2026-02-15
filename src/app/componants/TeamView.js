"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Cookies from "js-cookie";
import TeamForm from "./TeamForm";
import TeamInvite from "./TeamInvite";
import TeamOeuvres from "./TeamOeuvres";
import TeamKanban from "./TeamKanban";
import TeamGraphiques from "./TeamGraphiques";
import TeamHistorique from "./TeamHistorique";

export default function TeamView({ team: initialTeam, user, onBack, onUpdate }) {
  const [team, setTeam] = useState(initialTeam);
  const [members, setMembers] = useState([]);
  const [oeuvres, setOeuvres] = useState([]);
  const [memberRoles, setMemberRoles] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("members");
  const [showEdit, setShowEdit] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const isOwner = team.owner?.id === user?.id || team.owner === user?.id;
  const isEditor = userRole === "editor" || userRole === "editeur";
  const isAdmin = userRole === "admin" || isOwner;

  const fetchTeamDetails = useCallback(async () => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      // Récupérer la team avec toutes les relations
      const teamRes = await fetch(
        `/api/proxy/teams/${team.documentId}?populate=logo&populate=owner&populate=membres&populate=oeuvres.couverture&populate=oeuvres.users`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const teamData = await teamRes.json();

      if (teamData.data) {
        setTeam(teamData.data);
        setMembers(teamData.data.membres || []);
        setOeuvres(teamData.data.oeuvres || []);
      }

      // Récupérer TOUTES les invitations acceptées pour afficher les rôles
      const allRolesRes = await fetch(
        `/api/proxy/team-invitations?filters[team][documentId][$eq]=${team.documentId}&filters[status][$eq]=accepted&populate=user`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const allRolesData = await allRolesRes.json();

      // Construire la map userId -> role
      const rolesMap = {};
      (allRolesData.data || []).forEach((inv) => {
        if (inv.user?.id) {
          rolesMap[inv.user.id] = inv.role || "member";
        }
      });
      setMemberRoles(rolesMap);

      // Récupérer le rôle de l'utilisateur actuel
      if (!isOwner && user?.id) {
        setUserRole(rolesMap[user.id] || null);
      }

      // Récupérer les invitations en attente (si owner)
      if (isOwner) {
        const invitesRes = await fetch(
          `/api/proxy/team-invitations?filters[team][documentId][$eq]=${team.documentId}&filters[status][$eq]=pending&populate=user`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        const invitesData = await invitesRes.json();
        setPendingInvites(invitesData.data || []);
      }

    } catch (error) {
      console.error("Erreur fetch team details:", error);
      setErrorMsg("Impossible de charger les détails de la team.");
    } finally {
      setIsLoading(false);
    }
  }, [team.documentId, isOwner, user?.id]);

  useEffect(() => {
    fetchTeamDetails();
  }, [fetchTeamDetails]);

  const handleRemoveMember = async (memberId, memberName) => {
    if (!isAdmin) return;

    const shouldRemove = window.confirm(
      `Êtes-vous sûr de vouloir retirer ${memberName || "ce membre"} de la team ?`
    );
    if (!shouldRemove) return;

    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      const updatedMembers = members.filter((m) => m.id !== memberId).map((m) => m.id);

      await fetch(`/api/proxy/teams/${team.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: { membres: updatedMembers },
        }),
      });

      fetchTeamDetails();
    } catch (error) {
      console.error("Erreur suppression membre:", error);
      setErrorMsg("Erreur lors du retrait du membre.");
    }
  };

  const handleLeaveTeam = async () => {
    const shouldLeave = window.confirm(
      "Êtes-vous sûr de vouloir quitter cette team ?"
    );
    if (!shouldLeave) return;

    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      const updatedMembers = members.filter((m) => m.id !== user.id).map((m) => m.id);

      await fetch(`/api/proxy/teams/${team.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: { membres: updatedMembers },
        }),
      });

      onBack();
    } catch (error) {
      console.error("Erreur quitter team:", error);
      setErrorMsg("Erreur lors de la tentative de quitter la team.");
    }
  };

  const handleCancelInvite = async (inviteId) => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      await fetch(`/api/proxy/team-invitations/${inviteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });

      fetchTeamDetails();
    } catch (error) {
      console.error("Erreur annulation invitation:", error);
      setErrorMsg("Erreur lors de l'annulation de l'invitation.");
    }
  };

  const handleDeleteTeam = async () => {
    if (!isOwner) return;

    const shouldDelete = window.confirm(
      "Êtes-vous sûr de vouloir supprimer cette team ? Cette action est irréversible."
    );
    if (!shouldDelete) return;

    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      await fetch(`/api/proxy/teams/${team.documentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });

      onBack();
    } catch (error) {
      console.error("Erreur suppression team:", error);
      setErrorMsg("Erreur lors de la suppression de la team.");
    }
  };

  // Helper pour afficher le badge de rôle
  const getRoleBadge = (memberId) => {
    const role = memberRoles[memberId] || "member";
    switch (role) {
      case "admin":
        return (
          <span className="px-3 py-1 bg-purple-600/20 text-purple-400 text-sm font-medium rounded-full">
            Admin
          </span>
        );
      case "editor":
      case "editeur":
        return (
          <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm font-medium rounded-full">
            Éditeur
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-700/50 text-gray-400 text-sm rounded-full">
            Membre
          </span>
        );
    }
  };

  if (showEdit) {
    return (
      <TeamForm
        user={user}
        team={team}
        onClose={() => setShowEdit(false)}
        onSuccess={() => {
          setShowEdit(false);
          fetchTeamDetails();
          onUpdate();
        }}
      />
    );
  }

  return (
    <div className={`mx-auto ${activeTab === "kanban" || activeTab === "graphiques" ? "max-w-full px-2" : activeTab === "historique" ? "max-w-5xl" : "max-w-4xl"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
          aria-label="Retour aux teams"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-gray-400">Retour aux teams</span>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-600/20 border border-red-600/30 rounded-xl flex items-center justify-between">
          <p className="text-red-400 text-sm">{errorMsg}</p>
          <button onClick={() => setErrorMsg("")} className="text-red-400 hover:text-red-300 ml-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Team Header Card */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {(Array.isArray(team.logo) ? team.logo?.[0]?.url : team.logo?.url) ? (
            <Image
              src={Array.isArray(team.logo) ? team.logo[0].url : team.logo.url}
              alt={team.nom}
              className="w-20 h-20 rounded-xl object-cover"
              width={80}
              height={80}
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {team.nom?.[0]?.toUpperCase() || "T"}
              </span>
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white">{team.nom}</h2>
              {isOwner && (
                <span className="px-2 py-0.5 bg-amber-600/20 text-amber-400 text-xs font-medium rounded-full">
                  Owner
                </span>
              )}
              {!isOwner && userRole && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  userRole === "admin" ? "bg-purple-600/20 text-purple-400" :
                  userRole === "editor" || userRole === "editeur" ? "bg-blue-600/20 text-blue-400" :
                  "bg-gray-600/20 text-gray-400"
                }`}>
                  {userRole === "admin" ? "Admin" : userRole === "editor" || userRole === "editeur" ? "Éditeur" : "Membre"}
                </span>
              )}
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  team.isPublic
                    ? "bg-green-600/20 text-green-400"
                    : "bg-gray-600/20 text-gray-400"
                }`}
              >
                {team.isPublic ? "Publique" : "Privée"}
              </span>
            </div>
            <p className="text-gray-400 mb-2">@{team.slug}</p>
            {team.description && <p className="text-gray-400">{team.description}</p>}

            {/* Liens sociaux */}
            <div className="flex gap-3 mt-4">
              {team.discord && (
                <a
                  href={team.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-sm transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                  Discord
                </a>
              )}
              {team.website && (
                <a
                  href={team.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Site web
                </a>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isOwner && (
              <>
                <button
                  onClick={() => setShowEdit(true)}
                  className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 transition-colors"
                  title="Modifier"
                  aria-label="Modifier la team"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={handleDeleteTeam}
                  className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
                  title="Supprimer"
                  aria-label="Supprimer la team"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
            {!isOwner && (
              <button
                onClick={handleLeaveTeam}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium transition-colors"
                title="Quitter la team"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Quitter
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-6 pt-4 border-t border-gray-800/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{members.length + 1}</p>
            <p className="text-sm text-gray-400">Membres</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{oeuvres.length}</p>
            <p className="text-sm text-gray-400">Œuvres</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800 overflow-x-auto flex-nowrap">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2.5 font-medium text-sm transition-all relative whitespace-nowrap ${
            activeTab === "members" ? "text-indigo-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Membres ({members.length + 1})
          {activeTab === "members" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("oeuvres")}
          className={`px-4 py-2.5 font-medium text-sm transition-all relative whitespace-nowrap ${
            activeTab === "oeuvres" ? "text-indigo-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Œuvres ({oeuvres.length})
          {activeTab === "oeuvres" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("kanban")}
          className={`px-4 py-2.5 font-medium text-sm transition-all relative whitespace-nowrap ${
            activeTab === "kanban" ? "text-indigo-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Tâches
          {activeTab === "kanban" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("graphiques")}
          className={`px-4 py-2.5 font-medium text-sm transition-all relative whitespace-nowrap ${
            activeTab === "graphiques" ? "text-indigo-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Graphiques
          {activeTab === "graphiques" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("historique")}
          className={`px-4 py-2.5 font-medium text-sm transition-all relative whitespace-nowrap ${
            activeTab === "historique" ? "text-indigo-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Historique
          {activeTab === "historique" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab("invitations")}
            className={`px-4 py-2.5 font-medium text-sm transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === "invitations" ? "text-indigo-400" : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Invitations
            {pendingInvites.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-amber-600 text-white rounded-full">
                {pendingInvites.length}
              </span>
            )}
            {activeTab === "invitations" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === "members" ? (
        <div>
          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="mb-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Inviter un membre
            </button>
          )}

          <div className="space-y-3">
            {/* Owner */}
            <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
                  {team.owner?.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-white font-medium">{team.owner?.username || "Owner"}</p>
                  {isOwner && (
                    <p className="text-gray-400 text-sm">{team.owner?.email}</p>
                  )}
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-600/20 text-amber-400 text-sm font-medium rounded-full">
                Owner
              </span>
            </div>

            {/* Members */}
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {member.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-white font-medium">{member.username}</p>
                    {isOwner && (
                      <p className="text-gray-400 text-sm">{member.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getRoleBadge(member.id)}
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.username)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-600/20 transition-colors"
                      title="Retirer de la team"
                      aria-label={`Retirer ${member.username} de la team`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {members.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                Aucun autre membre dans cette team
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "oeuvres" ? (
        <TeamOeuvres
          team={team}
          user={user}
          isOwner={isOwner}
          isEditor={isEditor}
          isAdmin={isAdmin}
          onUpdate={fetchTeamDetails}
        />
      ) : activeTab === "kanban" ? (
        <TeamKanban
          team={team}
          user={user}
          isOwner={isOwner}
          isAdmin={isAdmin}
          isEditor={isEditor}
        />
      ) : activeTab === "graphiques" ? (
        <TeamGraphiques team={team} />
      ) : activeTab === "historique" ? (
        <TeamHistorique team={team} />
      ) : (
        /* Invitations Tab */
        <div>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.documentId}
                className="flex items-center justify-between p-4 bg-amber-600/10 border border-amber-600/20 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-400 font-bold">
                    {invite.user?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-white font-medium">{invite.user?.username}</p>
                    <p className="text-gray-400 text-sm">
                      Rôle: {invite.role === "editor" || invite.role === "editeur" ? "Éditeur" : invite.role === "admin" ? "Admin" : "Membre"} • En attente
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvite(invite.documentId)}
                  className="px-3 py-1.5 bg-gray-700/50 hover:bg-red-600/20 text-gray-400 hover:text-red-400 text-sm rounded-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            ))}

            {pendingInvites.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                Aucune invitation en attente
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <TeamInvite
          team={team}
          onClose={() => setShowInvite(false)}
          onSuccess={() => {
            setShowInvite(false);
            fetchTeamDetails();
          }}
        />
      )}
    </div>
  );
}
