"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import Cookies from "js-cookie";
import { strapiBlocksToHtml, htmlToStrapiBlocks, countWords } from "./strapiBlocksUtils";
import { useToast } from "./Toast";

const RichEditor = dynamic(() => import("./RichEditor"), { ssr: false });

export default function PanelView({
  oeuvre,
  couvertureUrl,
  chapitres,
  onBack,
  addedBy,
  embedded,
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
  // ─── Scan props (séparés des chapitres) ───
  scans,
  onAddScan,
  handleDeleteScan,
  onEditScan,
}) {
  const { titre, auteur, annee, etat, type } = oeuvre;
  const router = useRouter();
  const toast = useToast();

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
  const [currentPage, setCurrentPage] = useState(1);
  const CHAPITRES_PER_PAGE = 30;

  // Scans triés par ordre décroissant (mémorisé)
  const sortedScans = useMemo(() => {
    if (!scans || scans.length === 0) return [];
    return [...scans].sort((a, b) => Number(b.order) - Number(a.order));
  }, [scans]);

  // Chapitres filtrés et triés
  const allFilteredChapitres = useMemo(() => {
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

  // Pagination
  const totalPages = Math.ceil(allFilteredChapitres.length / CHAPITRES_PER_PAGE);
  const filteredChapitres = useMemo(() => {
    const start = (currentPage - 1) * CHAPITRES_PER_PAGE;
    return allFilteredChapitres.slice(start, start + CHAPITRES_PER_PAGE);
  }, [allFilteredChapitres, currentPage]);

  // Reset page when search/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder]);

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
      // D'abord charger les métadonnées (léger)
      setEditingChapitre(chapitre);
      setEditTitre(chapitre.titre || "");
      setEditOrder(chapitre.order || "");
      setEditTome(chapitre.tome || "");
      setEditTexte("<p>Chargement du contenu...</p>");

      // Puis charger le texte séparément (peut être lourd)
      const headerOpts = jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : {};
      let res = await fetch(`/api/proxy/chapitres/${chapitre.documentId}?fields[0]=texte&fields[1]=titre&fields[2]=order&fields[3]=tome`, headerOpts);
      
      // Fallback sans auth si erreur
      if (!res.ok) {
        res = await fetch(`/api/proxy/chapitres/${chapitre.documentId}?fields[0]=texte&fields[1]=titre&fields[2]=order&fields[3]=tome`);
      }

      if (res.ok) {
        const data = await res.json();
        const chap = data.data;
        if (chap) {
          setEditingChapitre(chap);
          setEditTitre(chap.titre || chapitre.titre || "");
          setEditOrder(chap.order || chapitre.order || "");
          setEditTome(chap.tome || chapitre.tome || "");
          const texteHTML = chap.texte
            ? strapiBlocksToHtml(chap.texte)
            : "";
          setEditTexte(texteHTML);
        }
      } else {
        console.error("Erreur chargement chapitre HTTP:", res.status);
        setEditTexte("<p>Erreur lors du chargement du contenu</p>");
      }
    } catch (err) {
      console.error("Erreur chargement chapitre :", err);
      toast.error("Erreur lors du chargement du chapitre.");
    } finally {
      setLoadingChapitre(false);
    }
  };

  const handleSaveChapitre = async () => {
    if (!editingChapitre) return;
    setSaving(true);

    const jwt = Cookies.get("jwt");

    const formattedTexte = htmlToStrapiBlocks(editTexte);

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
      toast.error("Erreur lors de la sauvegarde.");
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
              <h2 className="text-2xl font-bold">Modifier le chapitre</h2>
              <p className="text-gray-400 text-sm">Chapitre #{editingChapitre.order || "?"}</p>
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

            {/* Guide du système de classification intelligent */}
            <div className="mb-3 rounded-xl border border-indigo-500/30 bg-indigo-950/30 overflow-hidden">
              <details className="group">
                <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-indigo-900/20 transition-colors">
                  <div className="p-1.5 bg-indigo-600/20 rounded-lg">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-indigo-300">Mise en forme intelligente du texte</span>
                  <svg className="w-4 h-4 text-indigo-400 ml-auto transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm space-y-3 border-t border-indigo-500/20 pt-3">
                  <p className="text-gray-400">Le lecteur applique automatiquement un style visuel selon le type de ligne détecté. Écrivez naturellement, le système reconnaît :</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-800/50">
                      <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                      <div>
                        <span className="font-medium text-blue-300">Dialogue</span>
                        <p className="text-xs text-gray-400 mt-0.5">Commence par des guillemets «&nbsp;»&nbsp;"&nbsp;"</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-800/50">
                      <span className="w-2 h-2 mt-1.5 rounded-full bg-purple-400 flex-shrink-0"></span>
                      <div>
                        <span className="font-medium text-purple-300">Pensées</span>
                        <p className="text-xs text-gray-400 mt-0.5">Entre apostrophes &apos;...&apos; ou questions courtes</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-800/50">
                      <span className="w-2 h-2 mt-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                      <div>
                        <span className="font-medium text-amber-300">Effets sonores</span>
                        <p className="text-xs text-gray-400 mt-0.5">Onomatopées, interjections : Boom! Huff. Tsk.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-800/50">
                      <span className="w-2 h-2 mt-1.5 rounded-full bg-cyan-400 flex-shrink-0"></span>
                      <div>
                        <span className="font-medium text-cyan-300">Système / Badge</span>
                        <p className="text-xs text-gray-400 mt-0.5">Entre crochets : [Notification] [Alerte]</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-800/50 sm:col-span-2">
                      <span className="w-2 h-2 mt-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>
                      <div>
                        <span className="font-medium text-gray-300">Narration</span>
                        <p className="text-xs text-gray-400 mt-0.5">Tout le reste est traité comme du texte narratif classique</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 italic">Vous pouvez aussi coller du HTML brut — il sera automatiquement parsé et classifié. <a href="/documentation/editeur" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Documentation complète →</a></p>
                </div>
              </details>
            </div>

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
    <div className={embedded ? "text-white" : "min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white p-4 sm:p-8"}>
      {/* Header avec retour */}
      {!embedded && (
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
      )}

      {/* Card principale */}
      <div className={embedded ? "" : "max-w-6xl mx-auto"}>
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
                  <Image
                    src={couvertureUrl}
                    alt={titre}
                    className="w-32 h-44 sm:w-36 sm:h-52 object-cover rounded-xl shadow-2xl border-2 border-gray-700"
                    width={144}
                    height={208}
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
                
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">{titre || "Titre non disponible"}</h2>
                
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
                  {addedBy && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600/20 rounded-full">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span className="text-indigo-300 text-xs font-medium">Ajoutée par {addedBy.username}</span>
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
                      <div className="text-xs text-gray-400">chapitres</div>
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
                        <div className="text-xs text-gray-400">dernière MAJ</div>
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
                <p className="text-sm text-gray-400">{stats.total} chapitre{stats.total !== 1 ? 's' : ''}</p>
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
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium mb-2">
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
                      if (chapitre.pdf) {
                        // Les chapitres PDF s'ouvrent dans un nouvel onglet
                        window.open(chapitre.pdf, "_blank");
                      } else {
                        openInlineEditor(chapitre);
                      }
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
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Options du chapitre"
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
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
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
                      {addedBy && (
                        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                          <svg className="w-3 h-3 text-indigo-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-indigo-400/60">{addedBy.username}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-700/50">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Précédent
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center gap-1">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="text-gray-400 px-1">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          p === currentPage
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-700/50 text-gray-400 hover:bg-gray-600 hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Suivant →
              </button>
              
              <span className="text-xs text-gray-400 ml-2">
                Page {currentPage}/{totalPages} ({allFilteredChapitres.length} chapitres)
              </span>
            </div>
          )}
        </div>

        {/* ─── Section Scans (complètement séparée des chapitres) ─── */}
        {scans && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mt-6">
            {/* Header scans */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-600/20 rounded-lg">
                  <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Gestion des scans</h2>
                  <p className="text-sm text-gray-400">{scans.length} scan{scans.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              
              {onAddScan && (
                <button
                  onClick={onAddScan}
                  className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-pink-600/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Nouveau scan
                </button>
              )}
            </div>

            {/* Liste des scans */}
            {scans.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 font-medium mb-2">Aucun scan pour cette œuvre</p>
                {onAddScan && (
                  <button onClick={onAddScan} className="text-pink-400 hover:text-pink-300 text-sm">
                    Ajouter le premier scan
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedScans.map((scan) => {
                  const pageCount = scan.pages?.length || 0;

                  return (
                    <div
                      key={scan.documentId}
                      className="relative group bg-gray-700/30 hover:bg-gray-700/50 rounded-xl overflow-hidden transition-all duration-300 border border-transparent hover:border-gray-600 cursor-pointer"
                      onDoubleClick={() => onEditScan?.(scan)}
                    >
                      {/* Placeholder visuel */}
                      <div className="h-32 bg-gray-800 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>

                      {/* Infos du scan */}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-pink-600/30 text-pink-300 flex items-center justify-center font-bold text-sm">
                            {scan.order || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate group-hover:text-pink-300 transition-colors">
                              {scan.titre || "Sans titre"}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                              {scan.tome && (
                                <span className="px-1.5 py-0.5 bg-purple-600/20 text-purple-300 rounded">
                                  Tome {scan.tome}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 bg-pink-600/20 text-pink-300 rounded">
                                {pageCount} page{pageCount > 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions — toujours visibles sur mobile */}
                        <div className="flex items-center gap-2 mt-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => router.push(`/oeuvre/${oeuvre.documentId}/scan/${scan.order}`)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 rounded-lg text-sm transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Voir
                          </button>
                          {onEditScan && (
                            <button
                              onClick={() => onEditScan(scan)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm transition-colors"
                              aria-label={`Modifier le scan ${scan.titre}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Modifier
                            </button>
                          )}
                          {handleDeleteScan && (
                            <button
                              onClick={() => handleDeleteScan(scan)}
                              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
                              aria-label={`Supprimer le scan ${scan.titre}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
