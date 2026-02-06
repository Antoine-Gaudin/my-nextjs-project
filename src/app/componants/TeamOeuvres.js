"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import PanelOeuvre from "./PanelOeuvre";

const TEAMS_API = "http://localhost:1337/api";

export default function TeamOeuvres({ team, user, isOwner, isEditor, onUpdate }) {
  const [oeuvres, setOeuvres] = useState(team.oeuvres || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userOeuvres, setUserOeuvres] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOeuvre, setSelectedOeuvre] = useState(null);

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
      
      await fetch(`${TEAMS_API}/teams/${team.documentId}`, {
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

  const handleRemoveOeuvre = async (oeuvre) => {
    if (!canRemoveOeuvre(oeuvre)) return;
    
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      const updatedOeuvreIds = oeuvres
        .filter((o) => o.id !== oeuvre.id)
        .map((o) => o.id);

      await fetch(`${TEAMS_API}/teams/${team.documentId}`, {
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
  };

  // Si une œuvre est sélectionnée et que l'utilisateur peut éditer, afficher PanelOeuvre
  if (selectedOeuvre && canEdit) {
    return (
      <PanelOeuvre
        oeuvre={selectedOeuvre}
        onBack={() => setSelectedOeuvre(null)}
      />
    );
  }

  return (
    <div>
      {/* Actions */}
      {(isOwner || canEdit) && (
        <div className="flex gap-3 mb-6">
          {isOwner && (
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

      {/* Grille des œuvres */}
      {oeuvres.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">Aucune œuvre dans cette team</p>
          {isOwner && (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {oeuvres.map((oeuvre) => (
            <div
              key={oeuvre.documentId}
              className={`group relative bg-gray-800/30 rounded-xl overflow-hidden ${canEdit ? 'cursor-pointer hover:ring-2 hover:ring-indigo-500/50' : ''}`}
              onClick={() => canEdit && setSelectedOeuvre(oeuvre)}
            >
              <div className="aspect-[3/4] bg-gray-700">
                {oeuvre.couverture?.[0]?.url ? (
                  <img
                    src={oeuvre.couverture[0].url}
                    alt={oeuvre.titre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h4 className="text-white font-medium text-sm truncate">{oeuvre.titre}</h4>
                <p className="text-gray-500 text-xs">{oeuvre.type || "Œuvre"}</p>
                {/* Indicateur d'édition */}
                {canEdit && (
                  <p className="text-indigo-400 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Cliquer pour gérer les chapitres</p>
                )}
              </div>

              {/* Bouton supprimer - visible pour owner ou propriétaire de l'oeuvre */}
              {canRemoveOeuvre(oeuvre) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveOeuvre(oeuvre);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Retirer de la team"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                <div className="text-center py-12 text-gray-500">
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
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
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
                        <p className="text-gray-500 text-xs">{oeuvre.type || "Œuvre"}</p>
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
    </div>
  );
}
