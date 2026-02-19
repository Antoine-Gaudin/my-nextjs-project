"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Cookies from "js-cookie";
import ConfirmDialog from "./ConfirmDialog";

/* ─── LECTURE INTELLIGENTE ─── */
function classifyLine(text) {
  const trimmed = text.trim();
  if (!trimmed) return "empty";
  if (/^\[.+\]$/.test(trimmed)) return "game-badge";
  if (/^["«»\u201C\u201D\u00AB\u00BB]/.test(trimmed)) return "dialogue";
  if (/^[''\u2018\u2019]/.test(trimmed) && /[''\u2018\u2019]$/.test(trimmed)) return "thought";
  if (
    trimmed.length < 40 &&
    (/^([A-ZÀ-Úa-zà-ú][a-zà-ú]*[.!]\s*){2,}$/.test(trimmed) ||
      /^[A-ZÀ-ÚÉÈ\s!?~*─—]+$/.test(trimmed) ||
      (/!{1,}$/.test(trimmed) && trimmed.length < 25) ||
      /^\.{3,}$/.test(trimmed) ||
      /^─+\s*!?$/.test(trimmed))
  ) return "sfx";
  if (trimmed.length < 12 && /^[A-ZÀ-Úa-zà-ú]+[.!]+$/.test(trimmed)) return "sfx";
  if (trimmed.length < 15 && /^[.…!?─—]+$/.test(trimmed)) return "sfx";
  if (trimmed.length < 100 && /\?$/.test(trimmed) && !/^["«»\u201C\u201D]/.test(trimmed)) return "thought";
  return "narration";
}

function parseMessage(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const blocks = [];
  let consecutiveEmpties = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { consecutiveEmpties++; continue; }
    if (consecutiveEmpties >= 2) blocks.push({ type: "scene-break", text: "" });
    else if (consecutiveEmpties === 1 && blocks.length > 0) blocks.push({ type: "spacing", text: "" });
    consecutiveEmpties = 0;
    blocks.push({ type: classifyLine(trimmed), text: trimmed });
  }
  return blocks;
}

function SmartBlock({ block, idx }) {
  switch (block.type) {
    case "scene-break": return <div key={idx} className="scene-break" aria-hidden="true"><span>✦</span></div>;
    case "spacing": return <div key={idx} className="h-3" />;
    case "game-badge": return <div key={idx} className="game-badge">{block.text}</div>;
    case "dialogue": return <p key={idx} className="dialogue">{block.text}</p>;
    case "sfx": return <p key={idx} className="sfx">{block.text}</p>;
    case "thought": return <p key={idx} className="thought">{block.text}</p>;
    default: return <p key={idx} className="narration">{block.text}</p>;
  }
}

function SmartMessage({ message }) {
  const blocks = useMemo(() => parseMessage(message), [message]);
  if (blocks.length === 0) return null;
  return (
    <div className="chapter-content">
      <div className="smart-content">
        {blocks.map((block, i) => <SmartBlock key={i} block={block} idx={i} />)}
      </div>
    </div>
  );
}

export default function TeamAnnonces({ oeuvreId }) {
  const [annonces, setAnnonces] = useState([]);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, message: "", onConfirm: null });

  // Récupérer l'utilisateur courant
  useEffect(() => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    fetch("/api/proxy/users/me", {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.id) setCurrentUser(data);
      })
      .catch(() => {});
  }, []);

  // Récupérer les teams liées à cette œuvre + les annonces
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Trouver les teams qui ont cette œuvre
      const teamsRes = await fetch(
        `/api/proxy/teams?filters[oeuvres][documentId][$eq]=${oeuvreId}&populate=owner&populate=logo`
      );
      const teamsData = await teamsRes.json();
      const linkedTeams = teamsData.data || [];
      setTeams(linkedTeams);

      // 3. Récupérer les annonces pour cette œuvre
      const annoncesRes = await fetch(
        `/api/proxy/team-annonces?filters[oeuvre][documentId][$eq]=${oeuvreId}&populate=auteur&populate=team.logo&sort=createdAt:desc&pagination[pageSize]=50`
      );
      const annoncesData = await annoncesRes.json();
      setAnnonces(annoncesData.data || []);
    } catch (err) {
      console.error("Erreur fetch annonces:", err);
    } finally {
      setIsLoading(false);
    }
  }, [oeuvreId, currentUser]);

  useEffect(() => {
    if (oeuvreId) fetchData();
  }, [fetchData]);

  // Supprimer une annonce
  const handleDelete = (annonceDocumentId) => {
    setConfirmState({
      open: true,
      message: "Supprimer cette annonce ?",
      onConfirm: async () => {
        setConfirmState({ open: false, message: "", onConfirm: null });

        const jwt = Cookies.get("jwt");
        if (!jwt) return;

        try {
          await fetch(`/api/proxy/team-annonces/${annonceDocumentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${jwt}` },
          });
          fetchData();
        } catch (err) {
          console.error("Erreur suppression annonce:", err);
        }
      },
    });
  };

  // Format date relative
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
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Chargement des annonces...</p>
        </div>
      </div>
    );
  }

  // Si aucune team — afficher message vide
  if (teams.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800/50 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </div>
        <p className="text-gray-400">Aucune annonce pour le moment</p>
        <p className="text-gray-600 text-sm mt-1">Le traducteur publiera ses annonces ici</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      {/* En-tête teams liées */}
      <div className="flex flex-wrap gap-3">
        {teams.map((team) => (
          <div
            key={team.documentId}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-xl border border-gray-700/50"
          >
            {(Array.isArray(team.logo) ? team.logo?.[0]?.url : team.logo?.url) ? (
              <img
                src={Array.isArray(team.logo) ? team.logo[0].url : team.logo.url}
                alt={team.nom}
                className="w-6 h-6 rounded-md object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{team.nom?.[0]?.toUpperCase()}</span>
              </div>
            )}
            <span className="text-sm text-gray-300 font-medium">{team.nom}</span>
          </div>
        ))}
      </div>

      {/* Fil d'annonces */}}
      {annonces.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <p className="text-gray-400">Aucune annonce pour le moment</p>
          <p className="text-gray-600 text-sm mt-1">
            Le traducteur publiera ses annonces ici
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {annonces.map((annonce) => {
            const teamLogo = Array.isArray(annonce.team?.logo)
              ? annonce.team?.logo?.[0]?.url
              : annonce.team?.logo?.url;
            const isAnnonceOwner = currentUser && annonce.auteur?.id === currentUser.id;

            return (
              <div
                key={annonce.documentId}
                className="relative bg-gray-800/30 border border-gray-700/40 rounded-2xl p-5 hover:border-gray-700/60 transition-colors"
              >
                {/* Header — auteur + team + date */}
                <div className="flex items-start gap-3 mb-3">
                  {teamLogo ? (
                    <img
                      src={teamLogo}
                      alt={annonce.team?.nom}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white">
                        {annonce.team?.nom?.[0]?.toUpperCase() || "T"}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">
                        {annonce.team?.nom || "Team"}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400 text-sm">
                        {annonce.auteur?.username || "Anonyme"}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-600/20 text-amber-400 text-xs font-medium rounded-full">
                        Owner
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {formatDate(annonce.createdAt)}
                    </p>
                  </div>

                  {/* Supprimer (owner uniquement) */}
                  {isAnnonceOwner && (
                    <button
                      onClick={() => handleDelete(annonce.documentId)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                      title="Supprimer cette annonce"
                      aria-label="Supprimer cette annonce"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Message — Lecture Intelligente */}
                <SmartMessage message={annonce.message} />
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ open: false, message: "", onConfirm: null })}
      />
    </div>
  );
}
