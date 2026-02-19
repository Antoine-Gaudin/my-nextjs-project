"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import PanelOeuvre from "./PanelOeuvre";
import ConfirmDialog from "./ConfirmDialog";

export default function TeamOeuvres({ team, user, isOwner, isEditor, isAdmin, onUpdate }) {
  const [oeuvres, setOeuvres] = useState(team.oeuvres || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userOeuvres, setUserOeuvres] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOeuvre, setSelectedOeuvre] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, message: "", onConfirm: null });

  // Fermer modal avec Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showAddModal) setShowAddModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal]);

  // Vérifier si l'utilisateur peut éditer les chapitres
  const canEdit = isOwner || isEditor;

  // Vérifier si l'utilisateur peut retirer une œuvre
  const canRemoveOeuvre = (oeuvre) => {
    // Le owner de la team peut tout retirer
    if (isOwner) return true;
    // L'utilisateur peut retirer ses propres œuvres (celles où il est dans users)
    const oeuvreUserIds = oeuvre.users?.map((u) => u.id) || [];
    return oeuvreUserIds.includes(user.id);
  };

  // Récupérer les œuvres de l'utilisateur non encore liées à la team
  const fetchUserOeuvres = async () => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/proxy/oeuvres?filters[users][id][$eq]=${user.id}&populate=couverture`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const data = await res.json();
      
      // Filtrer les œuvres déjà dans la team
      const teamOeuvreIds = oeuvres.map((o) => o.documentId);
      const available = (data.data || []).filter(
        (o) => !teamOeuvreIds.includes(o.documentId)
      );
      
      setUserOeuvres(available);
    } catch (error) {
      console.error("Erreur fetch user oeuvres:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOeuvre = async (oeuvre) => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      // Ajouter l'œuvre à la team
      const currentOeuvreIds = oeuvres.map((o) => o.id);
      
      await fetch(`/api/proxy/teams/${team.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: { oeuvres: [...currentOeuvreIds, oeuvre.id] },
        }),
      });

      // Mettre à jour l'état local
      setOeuvres([...oeuvres, oeuvre]);
      setUserOeuvres(userOeuvres.filter((o) => o.documentId !== oeuvre.documentId));
      onUpdate();
    } catch (error) {
      console.error("Erreur ajout œuvre:", error);
    }
  };

  const handleRemoveOeuvre = (oeuvre) => {
    if (!canRemoveOeuvre(oeuvre)) return;

    setConfirmState({
      open: true,
      message: `Êtes-vous sûr de vouloir retirer "${oeuvre.titre || "cette œuvre"}" de la team ?`,
      onConfirm: async () => {
        setConfirmState({ open: false, message: "", onConfirm: null });

        const jwt = Cookies.get("jwt");
        if (!jwt) return;

        try {
          const updatedOeuvreIds = oeuvres
            .filter((o) => o.id !== oeuvre.id)
            .map((o) => o.id);

          await fetch(`/api/proxy/teams/${team.documentId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({
              data: { oeuvres: updatedOeuvreIds },
            }),
          });

          setOeuvres(oeuvres.filter((o) => o.id !== oeuvre.id));
          onUpdate();
        } catch (error) {
          console.error("Erreur suppression œuvre:", error);
        }
      },
    });
  };

  // Si une œuvre est sélectionnée et que l'utilisateur peut éditer, afficher PanelOeuvre
  if (selectedOeuvre && canEdit) {
    // Déterminer qui a ajouté cette œuvre (premier user lié, généralement le propriétaire)
    const addedByUser = selectedOeuvre.users?.[0] || null;
    return (
      <div>
        {/* Bouton retour */}
        <button
          onClick={() => setSelectedOeuvre(null)}
          className="mb-4 flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-xl font-medium transition-colors border border-gray-700/50 text-gray-300 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour aux œuvres
        </button>

        <PanelOeuvre
          oeuvre={selectedOeuvre}
          onBack={() => setSelectedOeuvre(null)}
          addedBy={addedByUser}
          embedded={true}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Actions */}
      {(isOwner || isAdmin || canEdit) && (
        <div className="flex gap-3 mb-6">
          {(isOwner || isAdmin || isEditor) && (
            <button
              onClick={() => {
                fetchUserOeuvres();
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Ajouter une œuvre existante
            </button>
          )}
        </div>
      )}

      {/* Liste des œuvres */}
      {oeuvres.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-gray-400 mb-4">Aucune œuvre dans cette team</p>
          {(isOwner || isAdmin || isEditor) && (
            <button
              onClick={() => {
                fetchUserOeuvres();
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
            >
              Ajouter votre première œuvre
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {oeuvres.map((oeuvre) => {
            const coverUrl = oeuvre.couverture?.[0]?.url || null;
            const addedBy = oeuvre.users?.[0] || null;

            return (
              <div
                key={oeuvre.documentId}
                className={`group relative bg-gray-800/40 hover:bg-gray-800/60 border border-gray-700/40 hover:border-indigo-600/30 rounded-2xl overflow-hidden transition-all duration-200 ${canEdit ? 'cursor-pointer' : ''}`}
                onClick={() => canEdit && setSelectedOeuvre(oeuvre)}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Couverture */}
                  <div className="sm:w-32 md:w-40 flex-shrink-0">
                    <div className="aspect-[3/4] sm:h-full bg-gray-700/50">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={oeuvre.titre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Infos */}
                  <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
                    <div>
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {oeuvre.type && (
                          <span className="px-2 py-0.5 bg-indigo-600/30 text-indigo-300 text-xs font-medium rounded uppercase">
                            {oeuvre.type}
                          </span>
                        )}
                        {oeuvre.etat && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            oeuvre.etat === "Terminé" ? "bg-green-600/30 text-green-300" :
                            oeuvre.etat === "En cours" ? "bg-blue-600/30 text-blue-300" :
                            oeuvre.etat === "En pause" ? "bg-amber-600/30 text-amber-300" :
                            "bg-gray-600/30 text-gray-300"
                          }`}>
                            {oeuvre.etat}
                          </span>
                        )}
                      </div>

                      {/* Titre */}
                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors mb-1 truncate">
                        {oeuvre.titre}
                      </h3>

                      {/* Méta */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                        {oeuvre.auteur && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {oeuvre.auteur}
                          </span>
                        )}
                        {oeuvre.annee && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {oeuvre.annee}
                          </span>
                        )}
                        {addedBy && (
                          <span className="flex items-center gap-1 text-indigo-400/80">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Ajoutée par {addedBy.username}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/30">
                      {canEdit && (
                        <span className="text-xs text-indigo-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Gérer les chapitres
                        </span>
                      )}
                      {!canEdit && <span />}

                      {canRemoveOeuvre(oeuvre) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveOeuvre(oeuvre);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-600/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Retirer de la team"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">Ajouter une œuvre</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : userOeuvres.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>Aucune œuvre disponible à ajouter</p>
                  <p className="text-sm mt-2">
                    Toutes vos œuvres sont déjà dans cette team ou vous n'avez pas d'œuvre.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {userOeuvres.map((oeuvre) => (
                    <button
                      key={oeuvre.documentId}
                      onClick={() => handleAddOeuvre(oeuvre)}
                      className="group bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 hover:border-indigo-600/30 rounded-xl overflow-hidden text-left transition-all"
                    >
                      <div className="aspect-[3/4] bg-gray-700">
                        {oeuvre.couverture?.[0]?.url ? (
                          <img
                            src={oeuvre.couverture[0].url}
                            alt={oeuvre.titre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="text-white font-medium text-sm truncate group-hover:text-indigo-400 transition-colors">
                          {oeuvre.titre}
                        </h4>
                        <p className="text-gray-400 text-xs">{oeuvre.type || "Œuvre"}</p>
                      </div>
                      <div className="px-3 pb-3">
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Ajouter à la team
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
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
