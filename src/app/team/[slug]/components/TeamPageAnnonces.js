"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import Cookies from "js-cookie";
import ConfirmDialog from "../../../components/ConfirmDialog";

const TYPE_CONFIG = {
  info: { label: "Info", color: "blue", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  update: { label: "Mise à jour", color: "green", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
  event: { label: "Événement", color: "purple", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  release: { label: "Sortie", color: "amber", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
};

const TYPE_COLORS = {
  blue: { bg: "bg-blue-600/20", border: "border-blue-600/30", text: "text-blue-400" },
  green: { bg: "bg-green-600/20", border: "border-green-600/30", text: "text-green-400" },
  purple: { bg: "bg-purple-600/20", border: "border-purple-600/30", text: "text-purple-400" },
  amber: { bg: "bg-amber-600/20", border: "border-amber-600/30", text: "text-amber-400" },
};

/* ─── LECTURE INTELLIGENTE : Classification du texte ─── */
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

/* ═══════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ═══════════════════════════════════════════════════════════════ */
export default function TeamPageAnnonces({ team, isOwner, currentUser, oeuvres = [] }) {
  const [annonces, setAnnonces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitre, setNewTitre] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newType, setNewType] = useState("info");
  const [newPinned, setNewPinned] = useState(false);
  const [selectedOeuvre, setSelectedOeuvre] = useState(null);
  const [showOeuvreSelector, setShowOeuvreSelector] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedAnnonce, setExpandedAnnonce] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterOeuvre, setFilterOeuvre] = useState("all");

  const fetchAnnonces = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/proxy/team-annonces?filters[team][documentId][$eq]=${team.documentId}&populate=auteur&populate=oeuvre.couverture&sort=isPinned:desc,createdAt:desc&pagination[pageSize]=50`
      );
      const data = await res.json();
      setAnnonces(data.data || []);
    } catch (err) {
      console.error("Erreur fetch annonces:", err);
    } finally {
      setIsLoading(false);
    }
  }, [team.documentId]);

  useEffect(() => {
    fetchAnnonces();
  }, [fetchAnnonces]);

  /* Filtered annonces */
  const filteredAnnonces = useMemo(() => {
    let result = annonces;
    if (filterType !== "all") result = result.filter((a) => a.type === filterType);
    if (filterOeuvre !== "all") {
      if (filterOeuvre === "none") result = result.filter((a) => !a.oeuvre);
      else result = result.filter((a) => a.oeuvre?.documentId === filterOeuvre);
    }
    return result;
  }, [annonces, filterType, filterOeuvre]);

  const linkedOeuvres = useMemo(() => {
    const map = new Map();
    annonces.forEach((a) => { if (a.oeuvre?.documentId) map.set(a.oeuvre.documentId, a.oeuvre); });
    return Array.from(map.values());
  }, [annonces]);

  const handlePost = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    setError("");
    setSuccess("");

    const jwt = Cookies.get("jwt");
    if (!jwt) { setError("Vous devez être connecté"); setIsSending(false); return; }

    try {
      const postData = {
        titre: newTitre.trim() || null,
        message: newMessage.trim(),
        type: newType,
        isPinned: newPinned,
        team: team.documentId,
        auteur: currentUser.id,
      };
      if (selectedOeuvre) postData.oeuvre = selectedOeuvre.documentId;

      const res = await fetch("/api/proxy/team-annonces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ data: postData }),
      });

      if (!res.ok) throw new Error("Erreur lors de l'envoi");

      setNewTitre("");
      setNewMessage("");
      setNewType("info");
      setNewPinned(false);
      setSelectedOeuvre(null);
      setShowOeuvreSelector(false);
      setShowForm(false);
      setSuccess("Annonce publiée !");
      setTimeout(() => setSuccess(""), 3000);
      fetchAnnonces();
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (documentId) => {
    setDeleteTarget(documentId);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      await fetch(`/api/proxy/team-annonces/${deleteTarget}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      fetchAnnonces();
    } catch (err) {
      console.error("Erreur suppression:", err);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleTogglePin = async (annonce) => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      await fetch(`/api/proxy/team-annonces/${annonce.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ data: { isPinned: !annonce.isPinned } }),
      });
      fetchAnnonces();
    } catch (err) {
      console.error("Erreur pin:", err);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* ── Header + bouton nouvelle annonce ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Annonces</h2>
          <p className="text-gray-400 text-sm mt-1">
            {annonces.length} annonce{annonces.length !== 1 ? "s" : ""} publiée{annonces.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--team-primary,#6366f1)] hover:opacity-90 text-white rounded-xl font-medium text-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
            </svg>
            {showForm ? "Annuler" : "Nouvelle annonce"}
          </button>
        )}
      </div>

      {/* ── Feedback ── */}
      {success && (
        <div className="px-4 py-3 bg-green-600/20 border border-green-600/30 rounded-xl text-green-400 text-sm flex items-center gap-2 animate-slide-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         FORMULAIRE DE CRÉATION
         ════════════════════════════════════════════════════════════ */}
      {showForm && isOwner && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 space-y-4 animate-slide-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Publier une annonce</p>
              <p className="text-gray-400 text-xs">En tant que {team.nom}</p>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-600/20 border border-red-600/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Type + Épinglé */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-gray-400 text-xs font-medium mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-white text-sm outline-none focus:border-indigo-600/50"
              >
                {Object.entries(TYPE_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg cursor-pointer hover:border-gray-600/50 transition-colors">
                <input
                  type="checkbox"
                  checked={newPinned}
                  onChange={(e) => setNewPinned(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-300 text-sm">📌 Épingler</span>
              </label>
            </div>
          </div>

          {/* ── Sélecteur d'œuvre ── */}
          {oeuvres.length > 0 && (
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-2">
                Lier à une œuvre (optionnel)
              </label>

              {selectedOeuvre ? (
                <div className="flex items-center gap-3 p-3 bg-indigo-600/10 border border-indigo-600/30 rounded-xl">
                  <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 relative bg-gray-800">
                    {selectedOeuvre.couverture?.[0]?.url ? (
                      <Image
                        src={selectedOeuvre.couverture[0].url}
                        alt={selectedOeuvre.titre}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-purple-700 flex items-center justify-center">
                        <svg className="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{selectedOeuvre.titre}</p>
                    <p className="text-indigo-400 text-xs">L&apos;annonce apparaîtra aussi sur la fiche de l&apos;œuvre</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOeuvre(null)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                    title="Retirer l'œuvre"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowOeuvreSelector(!showOeuvreSelector)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900/50 border border-gray-700/50 hover:border-gray-600/50 rounded-xl text-left transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="text-gray-400 text-sm">Sélectionner une œuvre...</span>
                  <svg className={`w-4 h-4 text-gray-500 ml-auto transition-transform ${showOeuvreSelector ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}

              {showOeuvreSelector && !selectedOeuvre && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto scrollbar-hide p-1">
                  {oeuvres.map((oeuvre) => (
                    <button
                      key={oeuvre.documentId}
                      type="button"
                      onClick={() => {
                        setSelectedOeuvre(oeuvre);
                        setShowOeuvreSelector(false);
                      }}
                      className="group flex flex-col items-center gap-2 p-3 bg-gray-900/40 hover:bg-gray-800/60 border border-gray-700/40 hover:border-[var(--team-primary,#6366f1)]/50 rounded-xl transition-all"
                    >
                      <div className="w-full aspect-[3/4] rounded-lg overflow-hidden relative bg-gray-800">
                        {oeuvre.couverture?.[0]?.url ? (
                          <Image
                            src={oeuvre.couverture[0].url}
                            alt={oeuvre.titre}
                            fill
                            sizes="120px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 font-medium text-center line-clamp-2 group-hover:text-white transition-colors">
                        {oeuvre.titre}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Titre (optionnel) */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1">Titre (optionnel)</label>
            <input
              type="text"
              value={newTitre}
              onChange={(e) => setNewTitre(e.target.value)}
              placeholder="Ex: Nouveau chapitre disponible !"
              className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-700/50 focus:border-indigo-600/50 rounded-xl text-white placeholder-gray-500 outline-none text-sm transition-colors"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1">Message *</label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={"Écrire votre annonce...\n\nAstuce : les dialogues (\"...\"), pensées (?), et effets spéciaux sont automatiquement stylisés !"}
              rows={6}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 focus:border-indigo-600/50 rounded-xl text-white placeholder-gray-500 outline-none resize-none text-sm transition-colors"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-gray-600 text-xs">
                💡 Lecture intelligente — dialogues, pensées et effets automatiquement stylisés
              </p>
              <p className="text-gray-600 text-xs">{newMessage.length}/2000</p>
            </div>
          </div>

          {/* Prévisualisation */}
          {newMessage.trim() && (
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-2">Aperçu</label>
              <div className="bg-gray-900/60 border border-gray-700/30 rounded-xl p-4">
                <SmartMessage message={newMessage} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowForm(false); setSelectedOeuvre(null); setShowOeuvreSelector(false); }}
              className="px-4 py-2 text-gray-400 hover:text-gray-300 text-sm transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handlePost}
              disabled={!newMessage.trim() || isSending || newMessage.length > 2000}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--team-primary,#6366f1)] hover:opacity-90 disabled:bg-gray-700 text-white disabled:text-gray-500 rounded-xl font-medium text-sm transition-all disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Publier{selectedOeuvre ? ` sur ${selectedOeuvre.titre}` : ""}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         FILTRES
         ════════════════════════════════════════════════════════════ */}
      {annonces.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-gray-800/40 rounded-xl p-1">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                filterType === "all"
                  ? "bg-[var(--team-primary,#6366f1)] text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Tout ({annonces.length})
            </button>
            {Object.entries(TYPE_CONFIG).map(([key, val]) => {
              const count = annonces.filter((a) => a.type === key).length;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    filterType === key
                      ? "bg-[var(--team-primary,#6366f1)] text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  {val.label} ({count})
                </button>
              );
            })}
          </div>

          {linkedOeuvres.length > 0 && (
            <select
              value={filterOeuvre}
              onChange={(e) => setFilterOeuvre(e.target.value)}
              className="px-3 py-1.5 bg-gray-800/40 border border-gray-700/50 rounded-xl text-gray-300 text-xs outline-none focus:border-indigo-600/50"
            >
              <option value="all">Toutes les œuvres</option>
              <option value="none">Annonce générale</option>
              {linkedOeuvres.map((o) => (
                <option key={o.documentId} value={o.documentId}>{o.titre}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         FIL D'ANNONCES
         ════════════════════════════════════════════════════════════ */}
      {filteredAnnonces.length === 0 && annonces.length > 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Aucune annonce ne correspond aux filtres</p>
          <button
            onClick={() => { setFilterType("all"); setFilterOeuvre("all"); }}
            className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : filteredAnnonces.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <p className="text-gray-400 font-medium">Aucune annonce pour le moment</p>
          <p className="text-gray-600 text-sm mt-1">
            {isOwner
              ? "Publiez votre première annonce pour vos abonnés !"
              : "Cette team n&apos;a pas encore publié d&apos;annonce"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnonces.map((annonce) => {
            const typeConf = TYPE_CONFIG[annonce.type] || TYPE_CONFIG.info;
            const colors = TYPE_COLORS[typeConf.color];
            const canDelete = currentUser && (
              annonce.auteur?.id === currentUser.id || isOwner
            );
            const isExpanded = expandedAnnonce === annonce.documentId;
            const isLong = (annonce.message || "").length > 300;
            const coverUrl = annonce.oeuvre?.couverture?.[0]?.url
              || (Array.isArray(annonce.oeuvre?.couverture) ? annonce.oeuvre?.couverture?.[0]?.url : null);

            return (
              <div
                key={annonce.documentId}
                className={`relative rounded-2xl overflow-hidden transition-colors ${
                  annonce.isPinned
                    ? "bg-amber-900/10 border border-amber-600/30"
                    : "bg-gray-800/30 border border-gray-700/40 hover:border-gray-700/60"
                }`}
              >
                {/* Bandeau œuvre lié */}
                {annonce.oeuvre && (
                  <Link
                    href={`/oeuvre/${annonce.oeuvre.documentId}`}
                    className="flex items-center gap-3 px-5 py-2.5 bg-indigo-600/10 border-b border-indigo-600/20 hover:bg-indigo-600/15 transition-colors"
                  >
                    {coverUrl ? (
                      <div className="w-6 h-8 rounded overflow-hidden relative flex-shrink-0">
                        <Image src={coverUrl} alt="" fill sizes="24px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-6 h-8 rounded bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                    <span className="text-indigo-400 text-xs font-medium truncate">
                      {annonce.oeuvre.titre}
                    </span>
                    <svg className="w-3 h-3 text-indigo-500 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}

                <div className="p-5">
                  {/* Épinglé badge */}
                  {annonce.isPinned && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-amber-600/20 rounded-full z-10">
                      <span className="text-xs">📌</span>
                      <span className="text-amber-400 text-xs font-medium">Épinglé</span>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center flex-shrink-0`}>
                      <svg className={`w-5 h-5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={typeConf.icon} />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 ${colors.bg} ${colors.text} text-xs font-medium rounded-full`}>
                          {typeConf.label}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400 text-sm">
                          {annonce.auteur?.username || team.nom}
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs mt-0.5">
                        {formatDate(annonce.createdAt)}
                      </p>
                    </div>

                    {canDelete && (
                      <div className="flex items-center gap-1">
                        {isOwner && (
                          <button
                            onClick={() => handleTogglePin(annonce)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              annonce.isPinned
                                ? "text-amber-400 hover:bg-amber-600/10"
                                : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/50"
                            }`}
                            title={annonce.isPinned ? "Désépingler" : "Épingler"}
                          >
                            <svg className="w-4 h-4" fill={annonce.isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(annonce.documentId)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Titre */}
                  {annonce.titre && (
                    <h3 className="text-white font-semibold text-lg mb-3">{annonce.titre}</h3>
                  )}

                  {/* Message — Lecture Intelligente */}
                  <div className={`${isLong && !isExpanded ? "max-h-48 overflow-hidden relative" : ""}`}>
                    <SmartMessage message={annonce.message} />
                    {isLong && !isExpanded && (
                      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-gray-900/90 to-transparent" />
                    )}
                  </div>

                  {isLong && (
                    <button
                      onClick={() => setExpandedAnnonce(isExpanded ? null : annonce.documentId)}
                      className="mt-2 text-sm text-[var(--team-primary,#6366f1)] hover:underline font-medium"
                    >
                      {isExpanded ? "Voir moins ▲" : "Lire la suite ▼"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Confirm dialog ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer l'annonce"
        message="Voulez-vous vraiment supprimer cette annonce ? Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
