"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Cookies from "js-cookie";

const RichEditor = dynamic(() => import("./RichEditor"), { ssr: false });

export default function PanelView({
  oeuvre,
  couvertureUrl,
  chapitres,
  onBack,
  message,
  isReordering,
  setIsReordering,
  openMenuId,
  setOpenMenuId,
  orderedChapitres,
  setOrderedChapitres,
  draggedIndex,
  setDraggedIndex,
  handleDrop,
  handleDeleteChapitre,
  handleCancelReorder,
  onAddChapitre,
  onImportWord,
  menuRef,
  onChapitreUpdated,
}) {
  const { titre, auteur, annee, etat, type } = oeuvre;
  const router = useRouter();

  // Inline editing state
  const [editingChapitre, setEditingChapitre] = useState(null);
  const [editTitre, setEditTitre] = useState("");
  const [editOrder, setEditOrder] = useState("");
  const [editTome, setEditTome] = useState("");
  const [editTexte, setEditTexte] = useState("");
  const [loadingChapitre, setLoadingChapitre] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Filtres et recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  // Chapitres filtrés et triés
  const filteredChapitres = useMemo(() => {
    let result = [...orderedChapitres];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.titre?.toLowerCase().includes(term) ||
        c.order?.toString().includes(term) ||
        c.tome?.toString().includes(term)
      );
    }
    
    return result.sort((a, b) => 
      sortOrder === "asc" ? a.order - b.order : b.order - a.order
    );
  }, [orderedChapitres, searchTerm, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const total = chapitres?.length || 0;
    const lastUpdate = chapitres?.length > 0 
      ? new Date(Math.max(...chapitres.map(c => new Date(c.updatedAt || c.publishedAt || 0))))
      : null;
    return { total, lastUpdate };
  }, [chapitres]);

  const openInlineEditor = async (chapitre) => {
    setLoadingChapitre(true);
    const jwt = Cookies.get("jwt");

    try {
      const res = await fetch(`/api/proxy/chapitres/${chapitre.documentId}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      const chap = data.data;

      setEditingChapitre(chap);
      setEditTitre(chap.titre || "");
      setEditOrder(chap.order || "");
      setEditTome(chap.tome || "");

      const texteHTML = chap.texte
        ? chap.texte.map((t) => `<p>${t.children?.[0]?.text || ""}</p>`).join("")
        : "";
      setEditTexte(texteHTML);
    } catch (err) {
      console.error("Erreur chargement chapitre :", err);
      alert("Erreur lors du chargement du chapitre.");
    } finally {
      setLoadingChapitre(false);
    }
  };

  const handleSaveChapitre = async () => {
    if (!editingChapitre) return;
    setSaving(true);

    const jwt = Cookies.get("jwt");

    const formattedTexte = editTexte
      .split(/<p>|<\/p>/)
      .filter((line) => line.trim() !== "")
      .map((line) => ({
        type: "paragraph",
        children: [{ type: "text", text: line.replace(/<br>/g, "\n").trim() }],
      }));

    if (formattedTexte.length === 0) {
      formattedTexte.push({
        type: "paragraph",
        children: [{ type: "text", text: editTexte.replace(/<[^>]+>/g, "") }],
      });
    }

    try {
      await fetch(`/api/proxy/chapitres/${editingChapitre.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            titre: editTitre,
            order: parseInt(editOrder, 10),
            tome: editTome || null,
            texte: formattedTexte,
          },
        }),
      });

      setEditingChapitre(null);
      if (onChapitreUpdated) onChapitreUpdated();
    } catch (err) {
      console.error("Erreur sauvegarde chapitre :", err);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingChapitre(null);
    setEditTexte("");
  };

  // Inline editor view
  if (editingChapitre) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white p-4 sm:p-8">
        {/* Header éditeur */}
        <div className="max-w-5xl mx-auto mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors border border-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour aux chapitres
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-medium transition-colors border border-red-600/30"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveChapitre}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 rounded-xl font-semibold transition-colors disabled:opacity-50 shadow-lg shadow-green-600/20"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Sauvegarder
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Formulaire d'édition */}
        <div className="max-w-5xl mx-auto bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-600/20 rounded-lg">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Modifier le chapitre</h1>
              <p className="text-gray-500 text-sm">Chapitre #{editingChapitre.order || "?"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Titre du chapitre</label>
              <input
                type="text"
                value={editTitre}
                onChange={(e) => setEditTitre(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="Ex: Chapitre 1 - Le Commencement"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Ordre</label>
              <input
                type="number"
                value={editOrder}
                onChange={(e) => setEditOrder(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Tome (optionnel)</label>
              <input
                type="text"
                value={editTome}
                onChange={(e) => setEditTome(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Contenu du chapitre</label>
            <div className="rounded-xl overflow-hidden border border-gray-600">
              <RichEditor
                value={editTexte}
                onChange={setEditTexte}
                height={500}
                placeholder="Écrivez le contenu du chapitre..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading overlay
  if (loadingChapitre) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl text-gray-400">Chargement du chapitre...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white p-4 sm:p-8">
      {/* Header avec retour */}
      <div className="max-w-6xl mx-auto mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-xl font-medium transition-colors border border-gray-700/50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour aux œuvres
        </button>
      </div>

      {/* Card principale */}
      <div className="max-w-6xl mx-auto">
        {/* Header de l'œuvre */}
        <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700/50 mb-6">
          {/* Background blur de la couverture */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: couvertureUrl ? `url('${couvertureUrl}')` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(40px)',
            }}
          />
          
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Couverture */}
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                {couvertureUrl ? (
                  <img
                    src={couvertureUrl}
                    alt={titre}
                    className="w-32 h-44 sm:w-36 sm:h-52 object-cover rounded-xl shadow-2xl border-2 border-gray-700"
                  />
                ) : (
                  <div className="w-32 h-44 sm:w-36 sm:h-52 rounded-xl bg-gradient-to-br from-indigo-800 to-purple-900 flex items-center justify-center border-2 border-gray-700 shadow-2xl">
                    <span className="text-5xl">📖</span>
                  </div>
                )}
              </div>

              {/* Infos */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                  {type && (
                    <span className="px-2.5 py-0.5 bg-indigo-600/40 text-indigo-300 rounded text-xs font-medium uppercase">
                      {type}
                    </span>
                  )}
                  {etat && (
                    <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                      etat === "Terminé" ? "bg-green-600/40 text-green-300" :
                      etat === "En cours" ? "bg-blue-600/40 text-blue-300" :
                      etat === "En pause" ? "bg-amber-600/40 text-amber-300" : "bg-gray-600/40 text-gray-300"
                    }`}>
                      {etat}
                    </span>
                  )}
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{titre || "Titre non disponible"}</h1>
                
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-gray-400 mb-4">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {auteur || "Auteur inconnu"}
                  </span>
                  {annee && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {annee}
                    </span>
                  )}
                </div>

                {/* Stats rapides */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <div>
                      <div className="text-lg font-bold text-white">{stats.total}</div>
                      <div className="text-xs text-gray-500">chapitres</div>
                    </div>
                  </div>
                  {stats.lastUpdate && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 rounded-lg">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {stats.lastUpdate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-xs text-gray-500">dernière MAJ</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message de succès */}
        {message && (
          <div className="mb-4 px-4 py-3 bg-green-600/20 border border-green-600/30 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-400 font-medium">{message}</p>
          </div>
        )}

        {/* Section Chapitres */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
          {/* Header avec actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/20 rounded-lg">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Gestion des chapitres</h2>
                <p className="text-sm text-gray-500">{stats.total} chapitre{stats.total !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onImportWord}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl font-medium transition-colors border border-purple-600/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Word
              </button>
              <button
                onClick={onAddChapitre}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-green-600/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Nouveau chapitre
              </button>
            </div>
          </div>

          {/* Barre d'outils */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Recherche */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher un chapitre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
            
            <div className="flex gap-2">
              {/* Tri */}
              <button
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-700/50 border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title={sortOrder === "asc" ? "Plus récents d'abord" : "Plus anciens d'abord"}
              >
                <svg className={`w-5 h-5 transition-transform duration-300 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              </button>
              
              {/* Réorganiser */}
              <button
                onClick={() => setIsReordering(!isReordering)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
                  isReordering 
                    ? "bg-amber-600/20 border-amber-600/30 text-amber-300" 
                    : "bg-gray-700/50 border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Bandeau de réorganisation */}
          {isReordering && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-amber-600/20 border border-amber-600/30 rounded-xl px-4 py-3 mb-4">
              <div className="flex items-center gap-2 text-amber-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Mode réorganisation actif</span>
                <span className="hidden sm:inline text-amber-400/70">- Glissez-déposez les chapitres</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsReordering(false)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-black rounded-lg font-medium transition-colors"
                >
                  Terminé
                </button>
                <button
                  onClick={handleCancelReorder}
                  className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Liste des chapitres */}
          {filteredChapitres.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium mb-2">
                {searchTerm ? "Aucun chapitre trouvé" : "Aucun chapitre pour cette œuvre"}
              </p>
              {searchTerm ? (
                <button
                  className="text-indigo-400 hover:text-indigo-300 text-sm"
                  onClick={() => setSearchTerm("")}
                >
                  Effacer la recherche
                </button>
              ) : (
                <button
                  onClick={onAddChapitre}
                  className="text-indigo-400 hover:text-indigo-300 text-sm"
                >
                  Ajouter le premier chapitre
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChapitres.map((chapitre, index) => (
                <div
                  key={chapitre.documentId}
                  draggable={isReordering}
                  onDragStart={() => setDraggedIndex(orderedChapitres.findIndex(c => c.documentId === chapitre.documentId))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(orderedChapitres.findIndex(c => c.documentId === chapitre.documentId))}
                  className={`relative group bg-gray-700/30 hover:bg-gray-700/50 rounded-xl p-4 transition-all duration-300 border ${
                    isReordering 
                      ? "cursor-grab border-dashed border-amber-500/50 hover:border-amber-500" 
                      : "cursor-pointer border-transparent hover:border-gray-600"
                  }`}
                  onClick={() => {
                    if (!isReordering) {
                      openInlineEditor(chapitre);
                    }
                  }}
                >
                  {/* Menu actions */}
                  <div className="absolute top-2 right-2 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === chapitre.id ? null : chapitre.id);
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    {openMenuId === chapitre.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 mt-1 w-44 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-30 overflow-hidden animate-fadeIn"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            openInlineEditor(chapitre);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-700 text-sm text-left transition-colors"
                        >
                          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Modifier
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsReordering(true);
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-700 text-sm text-left transition-colors"
                        >
                          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          Réorganiser
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChapitre(chapitre);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-red-600/20 text-sm text-left text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Numéro du chapitre */}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
                      isReordering 
                        ? "bg-amber-600/30 text-amber-300" 
                        : "bg-indigo-600/30 text-indigo-300 group-hover:bg-indigo-600/40"
                    }`}>
                      {chapitre.order || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {chapitre.titre || "Sans titre"}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        {chapitre.tome && (
                          <span className="px-1.5 py-0.5 bg-purple-600/20 text-purple-300 rounded">
                            Tome {chapitre.tome}
                          </span>
                        )}
                        {chapitre.pdf && (
                          <span className="px-1.5 py-0.5 bg-green-600/20 text-green-300 rounded">
                            PDF
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
