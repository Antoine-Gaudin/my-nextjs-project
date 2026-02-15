"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Cookies from "js-cookie";
import TeamCard from "./TeamCard";
import TeamForm from "./TeamForm";
import TeamView from "./TeamView";

export default function Teams({ user }) {
  const [teams, setTeams] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeTab, setActiveTab] = useState("myTeams");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchTeams = async () => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    setErrorMsg("");
    try {
      // Récupérer les teams où l'utilisateur est owner
      const ownerRes = await fetch(
        `/api/proxy/teams?filters[owner][id][$eq]=${user.id}&populate=logo&populate=membres&populate=oeuvres`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const ownerData = await ownerRes.json();

      // Récupérer les teams où l'utilisateur est membre
      const memberRes = await fetch(
        `/api/proxy/teams?filters[membres][id][$eq]=${user.id}&populate=logo&populate=membres&populate=oeuvres&populate=owner`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const memberData = await memberRes.json();

      // Combiner et dédupliquer
      const allTeams = [...(ownerData.data || [])];
      (memberData.data || []).forEach((team) => {
        if (!allTeams.find((t) => t.documentId === team.documentId)) {
          allTeams.push(team);
        }
      });

      setTeams(allTeams);

      // Récupérer les invitations en attente
      const invitesRes = await fetch(
        `/api/proxy/team-invitations?filters[user][id][$eq]=${user.id}&filters[status][$eq]=pending&populate=team.logo`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const invitesData = await invitesRes.json();
      setInvitations(invitesData.data || []);

    } catch (error) {
      console.error("Erreur fetch teams:", error);
      setErrorMsg("Impossible de charger vos teams. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchTeams();
    }
  }, [user]);

  const handleInvitationResponse = async (invitationId, accept) => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      const invitation = invitations.find((i) => i.documentId === invitationId);
      
      // Mettre à jour le statut de l'invitation
      await fetch(`/api/proxy/team-invitations/${invitationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: { status: accept ? "accepted" : "declined" },
        }),
      });

      if (accept && invitation?.team?.documentId) {
        // Récupérer la team et ses membres actuels
        const teamRes = await fetch(
          `/api/proxy/teams/${invitation.team.documentId}?populate=membres`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        const teamData = await teamRes.json();
        const currentMembers = teamData.data?.membres?.map((m) => m.id) || [];

        // Ajouter l'utilisateur aux membres
        await fetch(`/api/proxy/teams/${invitation.team.documentId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            data: { membres: [...currentMembers, user.id] },
          }),
        });
      }

      // Refresh
      fetchTeams();
    } catch (error) {
      console.error("Erreur réponse invitation:", error);
      setErrorMsg("Erreur lors de la réponse à l'invitation. Veuillez réessayer.");
    }
  };

  if (selectedTeam) {
    return (
      <TeamView
        team={selectedTeam}
        user={user}
        onBack={() => {
          setSelectedTeam(null);
          fetchTeams();
        }}
        onUpdate={fetchTeams}
      />
    );
  }

  if (showForm) {
    return (
      <TeamForm
        user={user}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false);
          fetchTeams();
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Mes Teams</h2>
          <p className="text-gray-400 mt-1">
            Gérez vos équipes de traduction et collaborez sur des projets
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/25"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Créer une Team
        </button>
      </div>

      {/* Message d'erreur */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-600/20 border border-red-600/30 rounded-xl flex items-center justify-between">
          <p className="text-red-400 text-sm">{errorMsg}</p>
          <button onClick={() => setErrorMsg("")} className="text-red-400 hover:text-red-300 ml-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Invitations en attente */}
      {invitations.length > 0 && (
        <div className="mb-8 p-4 bg-amber-600/20 border border-amber-600/30 rounded-xl">
          <h3 className="text-amber-300 font-semibold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Invitations en attente ({invitations.length})
          </h3>
          <div className="space-y-3">
            {invitations.map((invite) => (
              <div
                key={invite.documentId}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {(Array.isArray(invite.team?.logo) ? invite.team?.logo?.[0]?.url : invite.team?.logo?.url) ? (
                    <Image
                      src={Array.isArray(invite.team.logo) ? invite.team.logo[0].url : invite.team.logo.url}
                      alt={invite.team.nom}
                      className="w-10 h-10 rounded-lg object-cover"
                      width={40}
                      height={40}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
                      {invite.team?.nom?.[0] || "T"}
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">{invite.team?.nom || "Team"}</p>
                    <p className="text-gray-400 text-sm">Rôle: {invite.role === "editor" || invite.role === "editeur" ? "Éditeur" : invite.role === "admin" ? "Admin" : "Membre"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInvitationResponse(invite.documentId, true)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-medium transition-colors"
                  >
                    Accepter
                  </button>
                  <button
                    onClick={() => handleInvitationResponse(invite.documentId, false)}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg font-medium transition-colors"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        <button
          onClick={() => setActiveTab("myTeams")}
          className={`px-4 py-2.5 font-medium text-sm transition-all relative ${
            activeTab === "myTeams" ? "text-indigo-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Mes Teams ({teams.length})
          {activeTab === "myTeams" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("owned")}
          className={`px-4 py-2.5 font-medium text-sm transition-all relative ${
            activeTab === "owned" ? "text-indigo-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Teams créées ({teams.filter((t) => t.owner?.id === user.id || t.owner === user.id).length})
          {activeTab === "owned" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Chargement des teams...</p>
          </div>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-800 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucune team</h3>
          <p className="text-gray-400 mb-6">
            Créez votre première équipe pour collaborer sur des projets de traduction
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
          >
            Créer ma première Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(activeTab === "owned"
            ? teams.filter((t) => t.owner?.id === user.id || t.owner === user.id)
            : teams
          ).length === 0 && activeTab === "owned" ? (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-gray-400 mb-4">Vous n'avez créé aucune team</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
              >
                Créer une Team
              </button>
            </div>
          ) : (
            (activeTab === "owned"
              ? teams.filter((t) => t.owner?.id === user.id || t.owner === user.id)
              : teams
            ).map((team) => (
              <TeamCard
                key={team.documentId}
                team={team}
                user={user}
                onClick={() => setSelectedTeam(team)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
